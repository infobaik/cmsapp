import { dispatchProviderOrder } from './providers/index'

async function atomicDeductWallet(db: D1Database, userId: number, amount: number) {
  const query = `
    UPDATE wallets 
    SET balance_available = balance_available - ? 
    WHERE user_id = ? AND balance_available >= ?
    RETURNING balance_available
  `
  const result = await db.prepare(query).bind(amount, userId, amount).first()

  if (!result) throw new Error('INSUFFICIENT_BALANCE')
  return result.balance_available as number
}

// ========================================================================
// 1. GERBANG UTAMA TRANSAKSI BARU
// ========================================================================
export async function processNewOrder(
  db: D1Database, 
  userId: number, 
  productId: number, 
  customerNumber: string, 
  idempotencyKey: string,
  inputAmount: number = 0
) {
  const query = `
    SELECT p.price, p.order_type, p.status, p.provider_product_code, p.is_open_amount,
           pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url 
    FROM products p
    JOIN providers pr ON p.provider_id = pr.id
    WHERE p.id = ?
  `
  const product = await db.prepare(query).bind(productId).first()
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')

  if (product.order_type === 'prepaid') {
    return await executePrepaidLogics(db, userId, product, productId, customerNumber, idempotencyKey, inputAmount)
  } else if (product.order_type === 'inquiry' || product.order_type === 'postpaid') {
    return await executeInquiryLogics(db, userId, product, productId, customerNumber, idempotencyKey)
  } else {
    throw new Error('INVALID_ORDER_TYPE')
  }
}

// --- SUB-FUNGSI: PREPAID & BEBAS NOMINAL ---
async function executePrepaidLogics(db: D1Database, userId: number, product: any, productId: number, customerNumber: string, idempotencyKey: string, inputAmount: number) {
  const trxId = `PAS-${userId}-${Date.now()}`
  
  let totalPrice = product.price as number
  
  // 🔥 PERBAIKAN FATAL: KODE PRODUK TETAP MURNI (Contoh: BBSDN)
  let paymentProductCode = product.provider_product_code as string

  if (product.is_open_amount === 1) {
    if (!inputAmount || inputAmount < 1000) throw new Error('NOMINAL_MINIMAL_1000')
    totalPrice = inputAmount + (product.price as number)
    // KODE TIDAK DIGABUNG! paymentProductCode tetap murni!
  }

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
    // 🔥 PERBAIKAN FATAL: Kita lemparkan 'inputAmount' di akhir agar diterima Provider sebagai QTY!
    const providerResult = await dispatchProviderOrder(
      product.provider_name as string, 'payment',
      { endpoint: product.api_endpoint, key: product.api_key, secret: product.api_secret, proxy_url: product.proxy_url },
      paymentProductCode, customerNumber, trxId, inputAmount
    )

    let rawText = typeof providerResult.raw_response === 'string' ? providerResult.raw_response : (providerResult.raw_response?.raw_text || JSON.stringify(providerResult.raw_response));

    if (rawText.toUpperCase().includes('GAGAL')) {
       const customLog = "GAGAL. Sistem sedang gangguan. Silahkan coba beberapa saat lagi!";
       await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(totalPrice, userId).run();
       await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ?, server_log = ? WHERE id = ?`).bind(JSON.stringify(providerResult.raw_response), customLog, trxId).run();
       throw new Error(customLog);
    }

    let cleanLog = rawText.replace(/[\.\s,]*Saldo\s.*$/i, '').trim();
    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ?, server_log = ? WHERE id = ?`).bind(JSON.stringify(providerResult.raw_response), cleanLog, trxId).run()

    return { type: 'prepaid', success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    if (providerError.message !== "GAGAL. Sistem sedang gangguan. Silahkan coba beberapa saat lagi!") {
        await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(totalPrice, userId).run()
        await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`).bind(providerError.message, trxId).run()
    }
    throw new Error(providerError.message || 'PROVIDER_FAILED')
  }
}

// --- SUB-FUNGSI: INQUIRY / CEK TAGIHAN ---
async function executeInquiryLogics(db: D1Database, userId: number, product: any, productId: number, customerNumber: string, idempotencyKey: string) {
  const trxId = `PAS-${userId}-${Date.now()}`

  const inquiryResult = await dispatchProviderOrder(
    product.provider_name as string, 'inquiry',
    { endpoint: product.api_endpoint, key: product.api_key, secret: product.api_secret, proxy_url: product.proxy_url },
    product.provider_product_code as string, customerNumber, trxId
  )

  let rawText = typeof inquiryResult.raw_response === 'string' ? inquiryResult.raw_response : (inquiryResult.raw_response?.raw_text || JSON.stringify(inquiryResult.raw_response));
  const adminMarkup = product.price as number
  const billAmount = 0
  const totalPrice = adminMarkup
  let cleanLog = rawText.replace(/[\.\s,]*Saldo\s.*$/i, '').trim();
  let finalStatus = 'processing';

  if (rawText.toUpperCase().includes('GAGAL')) {
     cleanLog = "GAGAL. Sistem sedang gangguan. Silahkan coba beberapa saat lagi!";
     finalStatus = 'failed';
  }

  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, bill_amount, admin_markup, total_price, status, provider_response, server_log, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  await db.prepare(insertTrx).bind(
    trxId, userId, productId, customerNumber, product.order_type, billAmount, adminMarkup, totalPrice, finalStatus, 
    JSON.stringify(inquiryResult.raw_response), cleanLog, idempotencyKey
  ).run()

  if (finalStatus === 'failed') throw new Error(cleanLog);
  return { type: 'inquiry', trxId, message: cleanLog }
}

// ========================================================================
// 2. PROSES PELUNASAN TAGIHAN PASCABAYAR
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

  const newPaymentTrxId = `PAS-${userId}-${Date.now()}`
  const lockResult = await db.prepare(`UPDATE transactions SET id = ?, status = 'processing' WHERE id = ? AND status = 'waiting_payment'`).bind(newPaymentTrxId, oldTrxId).run()
  if (lockResult.meta.changes === 0) throw new Error('TRANSACTION_ALREADY_PROCESSED')

  try {
    await atomicDeductWallet(db, userId, trx.total_price as number)
  } catch (error) {
    await db.prepare(`UPDATE transactions SET id = ?, status = 'waiting_payment' WHERE id = ?`).bind(oldTrxId, newPaymentTrxId).run()
    throw error 
  }

  let paymentProductCode = (trx.provider_product_code as string).toUpperCase();
  if (paymentProductCode.startsWith('C')) paymentProductCode = 'B' + paymentProductCode.substring(1);

  try {
    const providerResult = await dispatchProviderOrder(
      trx.provider_name as string, 'payment',
      { endpoint: trx.api_endpoint as string, key: trx.api_key as string, secret: trx.api_secret as string, proxy_url: trx.proxy_url as string | null },
      paymentProductCode, trx.customer_number as string, newPaymentTrxId
    )

    let rawText = typeof providerResult.raw_response === 'string' ? providerResult.raw_response : (providerResult.raw_response?.raw_text || JSON.stringify(providerResult.raw_response));

    if (rawText.toUpperCase().includes('GAGAL')) {
       const customLog = "GAGAL. Sistem sedang gangguan. Silahkan coba beberapa saat lagi!";
       await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(trx.total_price, userId).run();
       await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ?, server_log = ? WHERE id = ?`).bind(JSON.stringify(providerResult.raw_response), customLog, newPaymentTrxId).run();
       throw new Error(customLog);
    }

    let cleanLog = rawText.replace(/[\.\s,]*Saldo\s.*$/i, '').trim();
    await db.prepare(`UPDATE transactions SET provider_response = ?, server_log = ? WHERE id = ?`).bind(JSON.stringify(providerResult.raw_response), cleanLog, newPaymentTrxId).run()

    return { success: true, trxId: newPaymentTrxId, sn: providerResult.sn }
  } catch (providerError: any) {
    if (providerError.message !== "GAGAL. Sistem sedang gangguan. Silahkan coba beberapa saat lagi!") {
        await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(trx.total_price, userId).run()
        await db.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`).bind(providerError.message, newPaymentTrxId).run()
    }
    throw new Error(providerError.message || 'PROVIDER_FAILED')
  }
}
