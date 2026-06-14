// src/services/transaction.ts

// --- 1. FUNGSI HELPER: PEMOTONGAN SALDO ATOMIC ---
// Fungsi ini menjamin tidak ada 'race condition'. Jika 2 request masuk di milidetik yang sama
// dan saldo hanya cukup untuk 1 transaksi, D1 (SQLite) akan memblokir request kedua secara otomatis.
async function atomicDeductWallet(db: D1Database, userId: number, amount: number) {
  const query = `
    UPDATE wallets 
    SET balance_available = balance_available - ? 
    WHERE user_id = ? AND balance_available >= ?
    RETURNING balance_available
  `
  
  const result = await db.prepare(query).bind(amount, userId, amount).first()

  if (!result) {
    // Error ini akan ditangkap oleh try-catch di API route dan diarahkan ke frontend
    // sebagai parameter ?warning=saldo_kurang
    throw new Error('INSUFFICIENT_BALANCE') 
  }

  return result.balance_available
}

// --- 2. ALUR PREPAID (Satu Langkah: Beli & Langsung Potong Saldo) ---
export async function processPrepaidOrder(
  db: D1Database, 
  userId: number, 
  productId: number, 
  customerNumber: string, 
  idempotencyKey: string
) {
  // 1. Cek validitas produk
  const product = await db.prepare(`SELECT id, price, order_type, status FROM products WHERE id = ?`).bind(productId).first()
  
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')
  if (product.order_type !== 'prepaid') throw new Error('INVALID_ORDER_TYPE')

  const trxId = crypto.randomUUID()
  const totalPrice = product.price as number

  // 2. KUNCI IDEMPOTENCY: Catat transaksi awal
  // Jika user double klik, D1 akan melempar error "UNIQUE constraint failed" pada idempotency_key
  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, total_price, status, idempotency_key)
    VALUES (?, ?, ?, ?, 'prepaid', ?, 'processing', ?)
  `
  await db.prepare(insertTrx).bind(trxId, userId, productId, customerNumber, totalPrice, idempotencyKey).run()

  // 3. POTONG SALDO ATOMIC (Aman dari antrean / bot)
  await atomicDeductWallet(db, userId, totalPrice)

  try {
    // 4. TEMBAK API PROVIDER (Simulasi)
    // Di dunia nyata: const response = await fetch('https://api.supplier.com/topup', { ... })
    const mockProviderResponse = JSON.stringify({ status: "SUCCESS", sn: "SN-1234567890" })

    // 5. UPDATE STATUS KE SUCCESS
    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ? WHERE id = ?`)
      .bind(mockProviderResponse, trxId).run()

    return { success: true, trxId, sn: "SN-1234567890" }
  } catch (providerError) {
    // JIKA PROVIDER GAGAL/GANGGUAN: Kembalikan saldo pengguna (Refund)
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(totalPrice, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed' WHERE id = ?`).bind(trxId).run()
    throw new Error('PROVIDER_FAILED')
  }
}

// --- 3. ALUR POSTPAID LANGKAH 1: Cek Tagihan (Inquiry) ---
export async function createPostpaidInquiry(
  db: D1Database, 
  userId: number, 
  productId: number, 
  customerNumber: string, 
  idempotencyKey: string
) {
  // Cek validitas produk
  const product = await db.prepare(`SELECT id, price, order_type, status FROM products WHERE id = ?`).bind(productId).first()
  
  if (!product || product.status !== 'active') throw new Error('PRODUCT_NOT_AVAILABLE')
  if (product.order_type !== 'postpaid') throw new Error('INVALID_ORDER_TYPE')

  // TEMBAK API PROVIDER UNTUK CEK TAGIHAN (Simulasi)
  // Di dunia nyata, response ini berisi nama pelanggan dan jumlah tagihan PLN/PDAM
  const mockBillAmount = 150000 
  const adminMarkup = product.price as number // Keuntungan web (misal Rp 2.500)
  const totalPrice = mockBillAmount + adminMarkup

  const trxId = crypto.randomUUID()
  const mockProviderResponse = JSON.stringify({ customer_name: "Budi Santoso", bill: 150000 })

  // Insert ke transaksi dengan status 'waiting_payment'. Saldo BELUM dipotong.
  const insertTrx = `
    INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, bill_amount, admin_markup, total_price, status, provider_response, idempotency_key)
    VALUES (?, ?, ?, ?, 'postpaid', ?, ?, ?, 'waiting_payment', ?, ?)
  `
  await db.prepare(insertTrx).bind(
    trxId, userId, productId, customerNumber, mockBillAmount, adminMarkup, totalPrice, mockProviderResponse, idempotencyKey
  ).run()

  return { trxId, customerName: "Budi Santoso", billAmount: mockBillAmount, adminMarkup, totalPrice }
}

// --- 4. ALUR POSTPAID LANGKAH 2: Konfirmasi Bayar ---
export async function payPostpaidBill(
  db: D1Database, 
  userId: number, 
  trxId: string
) {
  // 1. Ambil transaksi yang sedang menunggu pembayaran
  const trx = await db.prepare(`SELECT id, total_price, status FROM transactions WHERE id = ? AND user_id = ?`).bind(trxId, userId).first()
  
  if (!trx) throw new Error('TRANSACTION_NOT_FOUND')
  if (trx.status !== 'waiting_payment') throw new Error('TRANSACTION_ALREADY_PROCESSED')

  // 2. Kunci transaksi menjadi processing agar tidak bisa diklik bayar 2 kali oleh user (Idempotency tambahan)
  const lockResult = await db.prepare(`UPDATE transactions SET status = 'processing' WHERE id = ? AND status = 'waiting_payment'`).bind(trxId).run()
  if (lockResult.meta.changes === 0) {
     throw new Error('TRANSACTION_ALREADY_PROCESSED')
  }

  // 3. POTONG SALDO ATOMIC
  await atomicDeductWallet(db, userId, trx.total_price as number)

  try {
    // 4. TEMBAK API PROVIDER UNTUK PELUNASAN (Simulasi)
    const mockProviderResponse = JSON.stringify({ status: "PAID", receipt_url: "https://..." })

    // 5. UPDATE STATUS KE SUCCESS
    await db.prepare(`UPDATE transactions SET status = 'success', provider_response = ? WHERE id = ?`)
      .bind(mockProviderResponse, trxId).run()

    return { success: true, trxId }
  } catch (providerError) {
    // JIKA GAGAL BAYAR DI PROVIDER: Refund saldo dan kembalikan status ke failed
    await db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`)
      .bind(trx.total_price, userId).run()
    
    await db.prepare(`UPDATE transactions SET status = 'failed' WHERE id = ?`).bind(trxId).run()
    throw new Error('PROVIDER_FAILED')
  }
}
