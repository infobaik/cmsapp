import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'

const app = new Hono()

// =======================================================
// 🛠️ FUNGSI PINTAR: PARSER REQUEST (ANTI-KOSONG / ANTI-JSON-ERROR)
// =======================================================
async function getRequestBody(c: any) {
  const contentType = c.req.header('content-type') || ''
  if (contentType.includes('application/json')) {
    return await c.req.json()
  }
  return await c.req.parseBody()
}

// =======================================================
// 🛠️ FUNGSI BANTUAN: HASH PASSWORD SHA-256
// =======================================================
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// =======================================================
// 1. ENDPOINT AUTHENTICATION (LOGIN & REGISTER SUDAH FIXED)
// =======================================================
app.post('/auth/login', async (c) => {
  try {
    // 🔥 PERBAIKAN FATAL: Menggunakan parser pintar agar bisa membaca payload JSON maupun Form
    const body = await getRequestBody(c)
    const email = body.email as string
    const password = body.password as string

    console.log(`[LOGIN-TRY] Memproses login untuk email: '${email}'`)

    if (!email || !password) {
      console.error(`[LOGIN-FAIL] Input tidak lengkap. Email atau password kosong.`)
      return c.redirect('/login?error=Email+dan+password+wajib+diisi')
    }

    // Cari user di database
    const user = await c.env.DB.prepare(`SELECT id, password_hash, role FROM users WHERE email = ?`).bind(email).first()
    if (!user) {
       console.warn(`[LOGIN-FAIL] User dengan email '${email}' tidak ditemukan di database.`)
       return c.redirect('/login?error=Email+atau+password+salah')
    }

    // Hash input password dan bandingkan
    const inputHash = await hashPassword(password)
    console.log(`[LOGIN-HASH-CHECK] DB Hash: '${user.password_hash}' VS Input Hash: '${inputHash}'`)

    if (user.password_hash !== inputHash) {
       console.warn(`[LOGIN-FAIL] Password tidak cocok untuk email: '${email}'`)
       return c.redirect('/login?error=Email+atau+password+salah')
    }

    // Buat JWT Token aman (HS256)
    const jwtSecret = c.env.JWT_SECRET || 'super-secret-key-fallback-256-bit'
    const payload = {
      id: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // Berlaku 7 hari
    }
    
    const token = await sign(payload, jwtSecret)

    // Set token ke cookie browser
    setCookie(c, 'token', token, { 
      path: '/', 
      httpOnly: true, 
      secure: true, 
      maxAge: 604800 
    })

    console.log(`[LOGIN-SUCCESS] Pengguna '${email}' sukses login sebagai role: ${user.role}`)

    if (user.role === 'admin') {
       return c.redirect('/admin')
    }
    return c.redirect('/user/dashboard')

  } catch (error: any) {
    console.error(`[LOGIN-CRASH] Terjadi crash internal pada sistem login:`, error.message)
    return c.redirect('/login?error=System+Error')
  }
})

app.post('/auth/register', async (c) => {
  try {
    const body = await getRequestBody(c)
    const name = body.name as string
    const email = body.email as string
    const password = body.password as string
    
    console.log(`[REGISTER-TRY] Memproses pendaftaran email baru: '${email}'`)

    if (!name || !email || !password) {
       console.error(`[REGISTER-FAIL] Data form pendaftaran tidak lengkap atau kosong.`)
       return c.redirect('/register?error=Data+pendaftaran+tidak+lengkap')
    }

    const exist = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (exist) {
      console.warn(`[REGISTER-FAIL] Pendaftaran ditolak. Email '${email}' sudah terdaftar.`)
      return c.redirect('/register?error=Email+sudah+terdaftar')
    }

    const secureHash = await hashPassword(password)

    // Simpan ke database tanpa kolom phone yang ilegal
    await c.env.DB.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')`)
      .bind(name, email, secureHash).run()

    console.log(`[REGISTER-SUCCESS] Akun baru dengan email '${email}' berhasil disimpan ke database.`)
    return c.redirect('/login?success=Registrasi+berhasil,+silakan+login')

  } catch (error: any) {
    console.error(`[REGISTER-CRASH] Terjadi crash internal pada sistem pendaftaran:`, error.message)
    return c.redirect(`/register?error=System+Error:+${encodeURIComponent(error.message)}`)
  }
})

// =======================================================
// 2. ENDPOINT PUBLIK: ROOT API
// =======================================================
app.get('/', (c) => {
  return c.json({
    status: 'success',
    message: 'Welcome to Public API v1',
    endpoints: {
      produk: '/api/public/v1/produk',
      kategori: '/api/public/v1/kategori/:id',
      checkout: '/api/public/v1/checkout',
      track: '/api/public/v1/track'
    }
  })
})

// =======================================================
// 3. ENDPOINT: DETAIL KATEGORI (Murni JSON API)
// =======================================================
app.get('/kategori/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const strId = String(id)
    const intId = Number(id)

    let category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(strId).first()
    if (!category) {
      category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(intId).first()
    }

    if (!category) {
      return c.json({ success: false, message: 'Kategori tidak ditemukan' }, 404)
    }

    let subReqStr = await c.env.DB.prepare(`SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id = ? ORDER BY name ASC`).bind(strId).all()
    let subCategories = subReqStr.results || []
    
    if (subCategories.length === 0) {
      let subReqInt = await c.env.DB.prepare(`SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id = ? ORDER BY name ASC`).bind(intId).all()
      subCategories = subReqInt.results || []
    }

    let products: any[] = []
    if (subCategories.length === 0) {
      const qStr = `SELECT p.*, pr.name as provider_name FROM products p JOIN providers pr ON p.provider_id = pr.id WHERE p.category_id = ? AND p.status = 'active' AND p.is_visible = 1 ORDER BY p.price ASC`
      let prodReqStr = await c.env.DB.prepare(qStr).bind(strId).all()
      products = prodReqStr.results || []
      if (products.length === 0) {
        let prodReqInt = await c.env.DB.prepare(qStr).bind(intId).all()
        products = prodReqInt.results || []
      }
    }

    return c.json({
      success: true,
      data: { category, sub_categories: subCategories, products }
    }, 200)

  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// =======================================================
// 4. ENDPOINT PUBLIK: DAFTAR PRODUK (Katalog Publik)
// =======================================================
app.get('/produk', async (c) => {
  try {
    const search = c.req.query('search')
    const category = c.req.query('kategori')

    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.order_type, 
        p.is_open_amount, 
        p.image_url,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND p.is_visible = 1
    `
    const bindParams: any[] = []

    if (search) {
      query += ` AND p.name LIKE ?`
      bindParams.push(`%${search}%`)
    }

    if (category) {
      query += ` AND c.slug = ?`
      bindParams.push(category)
    }

    query += ` ORDER BY c.name ASC, p.price ASC`

    const { results } = await c.env.DB.prepare(query).bind(...bindParams).all()

    const formattedData = results.map((item: any) => ({
      id_produk: item.id,
      nama_produk: item.name,
      kategori: {
        nama: item.category_name || 'Umum',
        slug: item.category_slug || 'umum'
      },
      deskripsi: item.description || '',
      tipe_transaksi: item.order_type === 'inquiry' ? 'cek_tagihan' : (item.order_type === 'postpaid' ? 'bayar_tagihan' : 'topup_langsung'),
      bebas_nominal: {
        status: item.is_open_amount === 1,
        keterangan: item.is_open_amount === 1 ? 'User input nominal sendiri' : 'Harga sudah tetap'
      },
      harga: {
        nominal_angka: item.price,
        format_rupiah: item.is_open_amount === 1 
          ? `+ Rp ${item.price.toLocaleString('id-ID')} (Biaya Admin)` 
          : `Rp ${item.price.toLocaleString('id-ID')}`
      },
      icon_url: item.image_url || null
    }))

    return c.json({
      status: 'success',
      code: 200,
      message: 'Berhasil mengambil katalog produk',
      meta: {
        total_data: formattedData.length,
        filter_pencarian: search || null,
        filter_kategori: category || null
      },
      data: formattedData
    }, 200)

  } catch (error: any) {
    return c.json({
      status: 'error',
      code: 500,
      message: 'Gagal mengambil data produk dari server',
      error_detail: error.message
    }, 500)
  }
})

// ====================================================================
// 5. ENDPOINT: PUBLIC CHECKOUT (GUEST ORDER)
// ====================================================================
app.post('/checkout', async (c) => {
  try {
    const body = await getRequestBody(c);
    const productId = Number(body.product_id);
    const customerNumber = body.customer_number as string;
    const guestEmail = (body.guest_email as string) || null;
    const inputAmount = Number(body.amount) || 0; 
    
    if (!productId || !customerNumber) return c.json({ success: false, message: 'Data tidak lengkap' }, 400);

    const product = await c.env.DB.prepare(`SELECT price, is_open_amount FROM products WHERE id = ? AND status = 'active'`).bind(productId).first();
    if (!product) return c.json({ success: false, message: 'Produk tidak tersedia' }, 404);

    let totalPrice = product.price as number;
    if (product.is_open_amount === 1) {
      if (inputAmount < 1000) return c.json({ success: false, message: 'Nominal minimal Rp 1.000' }, 400);
      totalPrice = inputAmount + (product.price as number);
    }

    const gateway = await c.env.DB.prepare(`SELECT api_endpoint, api_key FROM payment_gateways WHERE status = 'active' LIMIT 1`).first();
    if (!gateway) return c.json({ success: false, message: 'Payment Gateway belum siap' }, 500);

    const orderId = `TRX-${globalThis.crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const idempotencyKey = globalThis.crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO transactions (id, user_id, product_id, customer_number, guest_email, order_type, bill_amount, total_price, status, idempotency_key)
      VALUES (?, 0, ?, ?, ?, 'prepaid', ?, ?, 'waiting_payment', ?)
    `).bind(orderId, productId, customerNumber, guestEmail, inputAmount, totalPrice, idempotencyKey).run();

    const hostUrl = new URL(c.req.url).origin;
    let targetUrl = (gateway.api_endpoint as string).endsWith('/trx') ? gateway.api_endpoint : gateway.api_endpoint + '/trx';
    
    const qrisRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${gateway.api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId, amount: totalPrice,
        webhook_url: `${hostUrl}/api/webhook/qrispay`,
      })
    });

    const qrisData = await qrisRes.json();
    if (qrisData.raw_qris) {
      return c.json({ success: true, order_id: orderId, raw_qris: qrisData.raw_qris, total_price: totalPrice });
    } else {
      return c.json({ success: false, message: 'Gagal men-generate QRIS' }, 500);
    }
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// ====================================================================
// 6. ENDPOINT: TRACK ORDER (AMAN DENGAN NO HP)
// ====================================================================
app.post('/track', async (c) => {
  try {
    const body = await getRequestBody(c);
    const orderId = body.order_id as string;
    const phone = body.phone as string;

    const trx = await c.env.DB.prepare(`
      SELECT t.status, t.customer_number, t.provider_response, t.total_price, t.created_at, p.name as product_name, c.slug as category_slug
      FROM transactions t
      JOIN products p ON t.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE t.id = ? AND t.user_id = 0
    `).bind(orderId).first();

    if (!trx) return c.json({ success: false, message: 'Pesanan tidak ditemukan.' }, 404);

    let isVoucher = String(trx.category_slug).includes('voucher');
    let secureSn = null;

    if (trx.status === 'success') {
      const responseObj = JSON.parse(trx.provider_response as string || '{}');
      const rawSn = responseObj.sn || responseObj.raw_text || 'SN belum didapatkan';

      if (isVoucher) {
        if (!phone || phone !== trx.customer_number) {
           return c.json({ success: false, require_phone: true, message: 'Silakan masukkan Nomor HP yang benar untuk melihat Kode Voucher.' }, 401);
        }
        secureSn = rawSn;
      } else {
        secureSn = rawSn;
      }
    }

    return c.json({
      success: true,
      data: {
        order_id: orderId,
        product_name: trx.product_name,
        customer_number: trx.customer_number,
        status: trx.status,
        total_price: trx.total_price,
        sn: secureSn,
        created_at: trx.created_at
      }
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default app
