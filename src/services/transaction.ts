import { dispatchProviderOrder } from './providers/index'

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

  const trxId = crypto.randomUUID()
  const totalPrice = product.price as number

  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, total_price, status, idempotency_key)
    VALUES (?, ?, ?, ?, 'prepaid', ?, 'processing', ?)
  `
  await db.prepare(insertTrx).bind(trxId, userId, productId, customerNumber, totalPrice, idempotencyKey).run()

  await atomicDeductWallet(db, userId, totalPrice)

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

    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ?, server_log = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), providerResult.server_log, trxId).run()

    return { success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(totalPrice, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed', server_log = ? WHERE id = ?`)
      .bind(providerError.message, trxId).run()
      
    throw new Error(providerError.message || 'PROVIDER_FAILED')
  }
}

export async function createPostpaidInquiry(
  db: D1Database, 
  userId: number, 
  productId: number, 
  customerNumber: string, 
  idempotencyKey: string
) {
  const query = `
    SELECT p.price, p.order_type, p.status, p.name, p.category_id, p.provider_product_code,
           pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url 
    FROM products p
    JOIN providers pr ON p.provider_id = pr.id
    WHERE p.id = ?
  `
  const product = await db.prepare(query).bind(productId).first()
  
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')
  if (product.order_type !== 'inquiry') throw new Error('INVALID_ORDER_TYPE')

  const trxId = crypto.randomUUID()

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

  const billAmount = inquiryResult.bill_amount || 0
  const inqCode = (product.provider_product_code as string).toUpperCase()

  const siblingQuery = `SELECT id, price, provider_product_code, name FROM products WHERE category_id = ? AND order_type = 'postpaid' AND status = 'active'`
  const { results: postpaids } = await db.prepare(siblingQuery).bind(product.category_id).all()
  
  let siblingPostpaid = null

  if (inqCode.startsWith('INQ')) {
    const targetCode = inqCode.replace(/^INQ/, 'PAY')
    siblingPostpaid = postpaids.find((p: any) => p.provider_product_code.toUpperCase() === targetCode)
  } else if (inqCode === 'CPLA') {
    siblingPostpaid = postpaids.find((p: any) => p.provider_product_code.toUpperCase() === 'BPLA')
  }
  
  if (!siblingPostpaid) {
    const expectedName = (product.name as string).replace(/^Cek /i, 'Bayar ').toLowerCase()
    siblingPostpaid = postpaids.find((p: any) => (p.name as string).toLowerCase() === expectedName)
  }

  // LOGIKA AMAN: Pengecekan Akun Standalone (E-Wallet / Game)
  if (!siblingPostpaid) {
    if (billAmount === 0 || inqCode.startsWith('CEK') || inqCode.startsWith('INQ')) {
       const insertTrx = `
         INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, bill_amount, admin_markup, total_price, status, provider_response, server_log, idempotency_key)
         VALUES (?, ?, ?, ?, 'inquiry', 0, 0, 0, 'success', ?, ?, ?)
       `
       await db.prepare(insertTrx).bind(
         trxId, userId, productId, customerNumber, JSON.stringify(inquiryResult.raw_response), inquiryResult.server_log, idempotencyKey
       ).run()

       return { 
         trxId, 
         customerName: inquiryResult.customer_name, 
         billAmount: 0, 
         adminMarkup: 0, 
         totalPrice: 0 
       }
    } else {
       throw new Error('PASANGAN_PRODUK_BAYAR_TIDAK_DITEMUKAN')
    }
  }

  const adminMarkup = siblingPostpaid.price as number
  const totalPrice = billAmount + adminMarkup

  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, bill_amount, admin_markup, total_price, status, provider_response, server_log, idempotency_key)
    VALUES (?, ?, ?, ?, 'postpaid', ?, ?, ?, 'waiting_payment', ?, ?, ?)
  `
  await db.prepare(insertTrx).bind(
    trxId, userId, siblingPostpaid.id, customerNumber, billAmount, adminMarkup, totalPrice, JSON.stringify(inquiryResult.raw_response), inquiryResult.server_log, idempotencyKey
  ).run()

  return { 
    trxId, 
    customerName: inquiryResult.customer_name, 
    billAmount, 
    adminMarkup, 
    totalPrice 
  }
}

export async function payPostpaidBill(
  db: D1Database, 
  userId: number, 
  trxId: string
) {
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

  await atomicDeductWallet(db, userId, trx.total_price as number)

  try {
    const providerResult = await dispatchProviderOrder(
      trx.provider_name as string,
      'payment',
      { 
        endpoint: trx.api_endpoint as string, 
        key: trx.api_key as string, 
        secret: trx.api_secret as string,
        proxy_url: trx.proxy_url as string | null
      },
      trx.provider_product_code as string,
      trx.customer_number as string,
      trxId
    )

    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ?, server_log = ? WHERE id = ?`)
      .bind(JSON.stringify(providerResult.raw_response), providerResult.server_log, trxId).run()

    return { success: true, trxId, sn: providerResult.sn }
  } catch (providerError: any) {
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(trx.total_price, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed', server_log = ? WHERE id = ?`)
      .bind(providerError.message, trxId).run()
      
    throw new Error(providerError.message || 'PROVIDER_FAILED')
  }
}
