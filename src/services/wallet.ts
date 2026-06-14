// Fungsi ini dipanggil secara internal (Server-Side), tidak akan pernah bocor ke public API
export async function getUserWallet(db: D1Database, userId: number) {
  try {
    const query = `SELECT balance_available, balance_pending FROM wallets WHERE user_id = ?`
    const wallet = await db.prepare(query).bind(userId).first()
    
    return wallet
  } catch (error) {
    console.error("Gagal mengambil data wallet:", error)
    return null
  }
}

// Fungsi internal untuk memindahkan status Pending ke Available (Validasi Affiliasi)
export async function approvePendingBalance(db: D1Database, userId: number, amount: number) {
  // Menggunakan D1 Batch Transaction untuk keamanan finansial
  const stmt1 = db.prepare(`UPDATE wallets SET balance_pending = balance_pending - ? WHERE user_id = ? AND balance_pending >= ?`).bind(amount, userId, amount)
  const stmt2 = db.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(amount, userId)
  
  await db.batch([stmt1, stmt2])
}
