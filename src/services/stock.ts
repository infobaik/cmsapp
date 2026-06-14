export async function processProductOrder(db: D1Database, productId: number, userId: number) {
  // 1. Cek detail produk
  const product = await db.prepare(`SELECT id, stock_type, price, status FROM products WHERE id = ?`).bind(productId).first()
  
  if (!product || product.status !== 'active') {
    throw new Error('Produk tidak tersedia atau tidak aktif.')
  }

  let finalItemData = "DATA_UMUM_BERKALI_KALI"

  // 2. Logika Manajemen Stok Internal
  if (product.stock_type === 'unique') {
    // Produk unik: Ambil SATU baris data rahasia dari inventory yang belum digunakan
    const inventoryItem = await db.prepare(`
      SELECT id, data FROM inventory 
      WHERE product_id = ? AND status = 'available' 
      LIMIT 1
    `).bind(product.id).first()

    if (!inventoryItem) {
      throw new Error('Stok produk unik ini sudah habis (Sold Out).')
    }

    // Tandai data unik tersebut sebagai 'used' agar tidak dibeli orang lain
    await db.prepare(`UPDATE inventory SET status = 'used' WHERE id = ?`).bind(inventoryItem.id).run()
    
    finalItemData = inventoryItem.data as string
  }

  // Catatan: Jika product.stock_type === 'general', tidak ada pengurangan stok di tabel inventory 
  // karena bisa dibeli berkali-kali tanpa batas.

  // 3. Proses potong saldo wallet dan catat transaksi
  // (Logika potongan saldo wallet akan diintegrasikan dengan wallet.ts di sini)

  return {
    success: true,
    product_id: product.id,
    item_delivered: finalItemData, // Memberikan kode SN/Lisensi jika unik
    price_paid: product.price
  }
}
