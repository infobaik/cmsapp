import { dispatchProviderOrder } from './providers/index'

// Fungsi Pemotong Saldo Aman (Anti-Nyangkut)
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
           pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url 
    FROM products p
    JOIN providers pr ON p.provider_id = pr.id
    WHERE p.id = ?
  `
  const product = await db.prepare(query).bind(productId).first()
  
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')
  if (product.order_type !== 'prepaid') throw new Error('INVALID_ORDER_TYPE')

  const trxId = `PAS-${userId}-${Date.now()}`
  const totalPrice = product.price as number

  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, total_price, status, idempotency_key)
    VALUES (?, ?, ?, ?, 'prepaid', ?, 'processing', ?)
  `
  await db.prepare(insertTrx).bind(trxId, userId, productId, customerNumber, totalPrice, idempotencyKey).run()

  try {
    await atomicDeductWallet(db, userId, totalPrice)
  } catch (error) {
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = 'Saldo tidak mencukupi' WHERE id = ?`).bind(trxId).run()
    throw error
  }

  try {
    const providerResult = await dispatchProviderOrder(
      product.provider_name as string,
      'payment',
      { 
        endpoint: product.api_endpoint as string, 
        key: product.api_key as string, 
        secret: product.api_secret as string,
        proxy_url: product.proxy_url as string | null
      },
      product.provider_product_code as string,
      customerNumber,
      trxId
    )

    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), trxId).run()

    return { success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(totalPrice, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`)
      .bind(providerError.message, trxId).run()
      
    throw new Error('PROVIDER_FAILED')
  }
}

// ========================================================================
// 2. PROSES CEK TAGIHAN POSTPAID / INQUIRY
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
           pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url 
    FROM products p
    JOIN providers pr ON p.provider_id = pr.id
    WHERE p.id = ?
  `
  const product = await db.prepare(query).bind(productId).first()
  
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')
  if (product.order_type !== 'inquiry' && product.order_type !== 'postpaid') throw new Error('INVALID_ORDER_TYPE')

  const trxId = `PAS-${userId}-${Date.now()}`

  const inquiryResult = await dispatchProviderOrder(
    product.provider_name as string,
    'inquiry',
    { 
      endpoint: product.api_endpoint as string, 
      key: product.api_key as string, 
      secret: product.api_secret as string,
      proxy_url: product.proxy_url as string | null
    },
    product.provider_product_code as string,
    customerNumber,
    trxId
  )

  let rawText = '';
  if (typeof inquiryResult.raw_response === 'string') {
     rawText = inquiryResult.raw_response;
  } else if (inquiryResult.raw_response?.raw_text) {
     rawText = inquiryResult.raw_response.raw_text;
  } else {
     rawText = JSON.stringify(inquiryResult.raw_response);
  }

  let cleanLog = rawText.replace(/[\.\s,]*Saldo\s.*$/i, '').trim();

  const adminMarkup = product.price as number
  const billAmount = 0
  const totalPrice = adminMarkup

  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, bill_amount, admin_markup, total_price, status, provider_response, server_log, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?)
  `
  await db.prepare(insertTrx).bind(
    trxId, 
    userId, 
    productId, 
    customerNumber, 
    product.order_type, 
    billAmount, 
    adminMarkup, 
    totalPrice, 
    JSON.stringify(inquiryResult.raw_response), 
    cleanLog,
    idempotencyKey
  ).run()

  return { trxId, customerName: '-', billAmount, adminMarkup, totalPrice, message: cleanLog }
}

// ========================================================================
// 3. PROSES BAYAR TAGIHAN POSTPAID
// ========================================================================
export async function payPostpaidBill(db: D1Database, userId: number, oldTrxId: string) {
  const trxQuery = `
    SELECT t.id, t.total_price, t.status, t.customer_number, 
           p.provider_product_code, pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN providers pr ON p.provider_id = pr.id
    WHERE t.id = ? AND t.user_id = ?
  `
  const trx = await db.prepare(trxQuery).bind(oldTrxId, userId).first()
  
  if (!trx) throw new Error('TRANSACTION_NOT_FOUND')
  if (trx.status !== 'waiting_payment') throw new Error('TRANSACTION_ALREADY_PROCESSED')

  // 🔥 PERBAIKAN MUTLAK: BUAT ID TRANSAKSI BARU UNTUK FASE PEMBAYARAN!
  const newPaymentTrxId = `PAS-${userId}-${Date.now()}`

  // 1. UPDATE ID LAMA JADI ID BARU DI DATABASE! 
  // Ini memastikan saat Webhook dari server provider memanggil ID Baru, database kita mengenalinya.
  const lockResult = await db.prepare(`
    UPDATE transactions 
    SET id = ?, status = 'processing' 
    WHERE id = ? AND status = 'waiting_payment'
  `).bind(newPaymentTrxId, oldTrxId).run()
  
  if (lockResult.meta.changes === 0) {
     throw new Error('TRANSACTION_ALREADY_PROCESSED')
  }

  // 2. Potong Saldo
  try {
    await atomicDeductWallet(db, userId, trx.total_price as number)
  } catch (error) {
    // Jika saldo kurang, kembalikan ID ke semula agar tidak error di mata User
    await db.prepare(`UPDATE transactions SET id = ?, status = 'waiting_payment' WHERE id = ?`).bind(oldTrxId, newPaymentTrxId).run()
    throw error 
  }

  // 3. Tembak Provider dengan ID BARU
  try {
    const providerResult = await dispatchProviderOrder(
      trx.provider_name as string, 'payment',
      { 
        endpoint: trx.api_endpoint as string, 
        key: trx.api_key as string, 
        secret: trx.api_secret as string,
        proxy_url: trx.proxy_url as string | null 
      },
      trx.provider_product_code as string, trx.customer_number as string, 
      newPaymentTrxId // <--- MENGIRIMKAN ID BARU KE PROVIDER!
    )

    // Jangan paksa success, biarkan Webhook yang mengubahnya menjadi success
    let initialResponseText = typeof providerResult.raw_response === 'string' 
      ? providerResult.raw_response 
      : (providerResult.raw_response?.raw_text || JSON.stringify(providerResult.raw_response));

    await db.prepare(`UPDATE transactions SET provider_response = ?, server_log = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), initialResponseText, newPaymentTrxId).run()

    return { success: true, trxId: newPaymentTrxId, sn: providerResult.sn }
  } catch (providerError: any) {
    // Refund jika gagal total dari server
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(trx.total_price, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`)
      .bind(providerError.message, newPaymentTrxId).run()
      
    throw new Error('PROVIDER_FAILED')
  }
}
