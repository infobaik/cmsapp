import { dispatchProviderOrder } from './providers/index'

// Fungsi untuk memotong saldo dengan aman
async function atomicDeductWallet(db: D1Database, userId: number, amount: number) {
  const query = `
    UPDATE wallets 
    SET balance_available = balance_available - ? 
    WHERE user_id = ? AND balance_available >= ?
    RETURNING balance_available
  `
  const result = await db.prepare(query).bind(amount, userId, amount).first()

  if (!result) {
    throw new Error('INSUFFICIENT_BALANCE')
  }

  return result.balance_available as number
}

// ========================================================================
// 1. PROSES ORDER PREPAID (PULSA/KUOTA)
// ========================================================================
export async function processPrepaidOrder(
  db: D1Database, 
  userId: number, 
  productId: number, 
  customerNumber: string, 
  idempotencyKey: string
) {
  const query = `
    SELECT p.price, p.order_type, p.status, p.provider_product_code,
           pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret 
    FROM products p
    JOIN providers pr ON p.provider_id = pr.id
    WHERE p.id = ?
  `
  const product = await db.prepare(query).bind(productId).first()
  
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')
  if (product.order_type !== 'prepaid') throw new Error('INVALID_ORDER_TYPE')

  const trxId = typeof globalThis.crypto.randomUUID === 'function' ? globalThis.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)
  const totalPrice = product.price as number

  // 1. Masukkan data awal sebagai processing
  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, total_price, status, idempotency_key)
    VALUES (?, ?, ?, ?, 'prepaid', ?, 'processing', ?)
  `
  await db.prepare(insertTrx).bind(trxId, userId, productId, customerNumber, totalPrice, idempotencyKey).run()

  // 2. PERBAIKAN MUTLAK: Potong Saldo dengan Try-Catch
  try {
    await atomicDeductWallet(db, userId, totalPrice)
  } catch (error) {
    // Jika saldo kurang, otomatis ubah status transaksi yang nyangkut menjadi GAGAL
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = 'Saldo tidak mencukupi' WHERE id = ?`).bind(trxId).run()
    throw error
  }

  // 3. Tembak ke Provider jika saldo berhasil dipotong
  try {
    const providerResult = await dispatchProviderOrder(
      product.provider_name as string,
      'payment',
      { 
        endpoint: product.api_endpoint as string, 
        key: product.api_key as string, 
        secret: product.api_secret as string 
      },
      product.provider_product_code as string,
      customerNumber,
      trxId
    )

    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), trxId).run()

    return { success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    // Jika provider gagal, kembalikan saldo user dan gagalkan transaksi
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(totalPrice, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`)
      .bind(providerError.message, trxId).run()
      
    throw new Error('PROVIDER_FAILED')
  }
}

// ========================================================================
// 2. PROSES CEK TAGIHAN POSTPAID (INQUIRY)
// ========================================================================
export async function createPostpaidInquiry(
  db: D1Database, 
  userId: number, 
  productId: number, 
  customerNumber: string, 
  idempotencyKey: string
) {
  const query = `
    SELECT p.price, p.order_type, p.status, p.provider_product_code,
           pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret 
    FROM products p
    JOIN providers pr ON p.provider_id = pr.id
    WHERE p.id = ?
  `
  const product = await db.prepare(query).bind(productId).first()
  
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')
  if (product.order_type !== 'postpaid') throw new Error('INVALID_ORDER_TYPE')

  const trxId = typeof globalThis.crypto.randomUUID === 'function' ? globalThis.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)

  const inquiryResult = await dispatchProviderOrder(
    product.provider_name as string,
    'inquiry',
    { 
      endpoint: product.api_endpoint as string, 
      key: product.api_key as string, 
      secret: product.api_secret as string 
    },
    product.provider_product_code as string,
    customerNumber,
    trxId
  )

  const billAmount = inquiryResult.bill_amount
  const adminMarkup = product.price as number
  const totalPrice = billAmount + adminMarkup

  // Status awal waiting_payment sampai Webhook memastikannya
  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, bill_amount, admin_markup, total_price, status, provider_response, idempotency_key)
    VALUES (?, ?, ?, ?, 'postpaid', ?, ?, ?, 'waiting_payment', ?, ?)
  `
  await db.prepare(insertTrx).bind(
    trxId, userId, productId, customerNumber, billAmount, adminMarkup, totalPrice, JSON.stringify(inquiryResult.raw_response), idempotencyKey
  ).run()

  return { 
    trxId, 
    customerName: inquiryResult.customer_name, 
    billAmount, 
    adminMarkup, 
    totalPrice 
  }
}

// ========================================================================
// 3. PROSES BAYAR TAGIHAN POSTPAID
// ========================================================================
export async function payPostpaidBill(
  db: D1Database, 
  userId: number, 
  trxId: string
) {
  const trxQuery = `
    SELECT t.id, t.total_price, t.status, t.customer_number, 
           p.provider_product_code, pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN providers pr ON p.provider_id = pr.id
    WHERE t.id = ? AND t.user_id = ?
  `
  const trx = await db.prepare(trxQuery).bind(trxId, userId).first()
  
  if (!trx) throw new Error('TRANSACTION_NOT_FOUND')
  if (trx.status !== 'waiting_payment') throw new Error('TRANSACTION_ALREADY_PROCESSED')

  // 1. Kunci transaksi jadi processing
  const lockResult = await db.prepare(`UPDATE transactions SET status = 'processing' WHERE id = ? AND status = 'waiting_payment'`).bind(trxId).run()
  if (lockResult.meta.changes === 0) {
     throw new Error('TRANSACTION_ALREADY_PROCESSED')
  }

  // 2. PERBAIKAN MUTLAK: Potong Saldo dengan Try-Catch
  try {
    await atomicDeductWallet(db, userId, trx.total_price as number)
  } catch (error) {
    // Jika saldo kurang, kembalikan statusnya jadi waiting_payment agar user bisa topup
    // dan mencoba menekan tombol "Bayar" lagi nanti.
    await db.prepare(`UPDATE transactions SET status = 'waiting_payment' WHERE id = ?`).bind(trxId).run()
    throw error // Lemparkan pesan 'INSUFFICIENT_BALANCE' ke UI
  }

  // 3. Tembak ke Provider
  try {
    const providerResult = await dispatchProviderOrder(
      trx.provider_name as string,
      'payment',
      { 
        endpoint: trx.api_endpoint as string, 
        key: trx.api_key as string, 
        secret: trx.api_secret as string 
      },
      trx.provider_product_code as string,
      trx.customer_number as string,
      trxId
    )

    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), trxId).run()

    return { success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    // Kembalikan Saldo Jika Provider Gagal
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(trx.total_price, userId).run()
    
    // Transaksi digagalkan
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`)
      .bind(providerError.message, trxId).run()
      
    throw new Error('PROVIDER_FAILED')
  }
}
