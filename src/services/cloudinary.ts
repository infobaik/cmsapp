// src/services/cloudinary.ts

export async function uploadToCloudinary(db: D1Database, file: File) {
  // 1. Tarik kredensial dari tabel system_settings
  const settings = await db.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'cloudinary_%'`).all()
  
  const config = settings.results.reduce((acc: any, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  const cloudName = config.cloudinary_cloud_name;
  const apiKey = config.cloudinary_api_key;
  const apiSecret = config.cloudinary_api_secret;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Kredensial Cloudinary belum diatur di Admin Area');
  }

  // 2. Siapkan parameter upload (Unsigned Upload direkomendasikan untuk REST sederhana)
  // Catatan: Pastikan Anda membuat "Upload Preset" bertipe 'unsigned' di setelan Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'ml_default'); // Ganti dengan nama preset unsigned Anda
  
  // Jika ingin menggunakan Signed Upload (Lebih aman), Anda butuh fungsi crypto SHA-1
  // Namun untuk efisiensi serverless, unsigned upload dengan preset spesifik lebih disukai

  // 3. Tembak API Cloudinary
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal mengunggah gambar ke Cloudinary');
  }

  // 4. Kembalikan URL gambar yang sudah aman (HTTPS)
  return data.secure_url;
}
