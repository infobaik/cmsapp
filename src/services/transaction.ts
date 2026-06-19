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
  // 🔥 PERBAIKAN: Memasukkan pr.proxy_url ke dalam query
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

  // Potong Saldo dengan Try-Catch agar tidak nyangkut
  try {
    await atomicDeductWallet(db, userId, totalPrice)
  } catch (error) {
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = 'Saldo tidak mencukupi' WHERE id = ?`).bind(trxId).run()
    throw error
  }

  try {
    // 🔥 PERBAIKAN: Meneruskan proxy_url ke dispatchProviderOrder
    const providerResult = await dispatchProviderOrder(
      product.provider_name as string,
      'payment',
      { 
        endpoint: product.api_endpoint as string, 
        key: product.api_key as string, 
        secret: product.api_secret as string,
        proxy: product.proxy_url as string 
      },
      product.provider_product_code as string,
      customerNumber,
      trxId
    )

    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), trxId).run()

    return { success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    // Refund jika provider error
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
  // 🔥 PERBAIKAN: Memasukkan pr.proxy_url ke dalam query
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

  // 🔥 PERBAIKAN: Meneruskan proxy_url ke dispatchProviderOrder
  const inquiryResult = await dispatchProviderOrder(
    product.provider_name as string,
    'inquiry',
    { 
      endpoint: product.api_endpoint as string, 
      key: product.api_key as string, 
      secret: product.api_secret as string,
      proxy: product.proxy_url as string 
    },
    product.provider_product_code as string,
    customerNumber,
    trxId
  )

  // Ambil respon mentah dari provider
  let rawText = '';
  if (typeof inquiryResult.raw_response === 'string') {
     rawText = inquiryResult.raw_response;
  } else if (inquiryResult.raw_response?.raw_text) {
     rawText = inquiryResult.raw_response.raw_text;
  } else {
     rawText = JSON.stringify(inquiryResult.raw_response);
  }

  // BERSIIHKAN KATA "SALDO" PADA RESPON AWAL
  let cleanLog = rawText.replace(/[\.\s,]*Saldo\s.*$/i, '').trim();

  const adminMarkup = product.price as number
  
  // Karena ini baru respon awal, bill_amount di-set 0 (Tunggu Webhook!)
  const billAmount = 0
  const totalPrice = adminMarkup

  // SIMPAN KE DATABASE SEBAGAI 'processing' (Tunggu Webhook untuk mengubahnya)
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
export async function payPostpaidBill(db: D1Database, userId: number, trxId: string) {
  // 🔥 PERBAIKAN: Memasukkan pr.proxy_url ke dalam query
  const trxQuery = `
    SELECT t.id, t.total_price, t.status, t.customer_number, 
           p.provider_product_code, pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN providers pr ON p.provider_id = pr.id
    WHERE t.id = ? AND t.user_id = ?
  `
  const trx = await db.prepare(trxQuery).bind(trxId, userId).first()
  
  if (!trx) throw new Error('TRANSACTION_NOT_FOUND')
  if (trx.status !== 'waiting_payment') throw new Error('TRANSACTION_ALREADY_PROCESSED')

  const lockResult = await db.prepare(`UPDATE transactions SET status = 'processing' WHERE id = ? AND status = 'waiting_payment'`).bind(trxId).run()
  if (lockResult.meta.changes === 0) {
     throw new Error('TRANSACTION_ALREADY_PROCESSED')
  }

  // Potong Saldo (Jika gagal, balikkan ke waiting_payment)
  try {
    await atomicDeductWallet(db, userId, trx.total_price as number)
  } catch (error) {
    await db.prepare(`UPDATE transactions SET status = 'waiting_payment' WHERE id = ?`).bind(trxId).run()
    throw error 
  }

  try {
    // 🔥 PERBAIKAN: Meneruskan proxy_url ke dispatchProviderOrder
    const providerResult = await dispatchProviderOrder(
      trx.provider_name as string, 'payment',
      { 
        endpoint: trx.api_endpoint as string, 
        key: trx.api_key as string, 
        secret: trx.api_secret as string,
        proxy: trx.proxy_url as string 
      },
      trx.provider_product_code as string, trx.customer_number as string, trxId
    )

    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), trxId).run()

    return { success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    // Refund jika gagal
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(trx.total_price, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`)
      .bind(providerError.message, trxId).run()
      
    throw new Error('PROVIDER_FAILED')
  }
}
