export const uploadToCloudinary = async (DB: any, file: File): Promise<string> => {
    
    // 1. Tarik Kredensial dari Database
    const { results } = await DB.prepare(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('cloudinary_cloud_name', 'cloudinary_api_key', 'cloudinary_api_secret')
    `).all()
    
    const config: Record<string, string> = {}
    results.forEach((row: any) => { config[row.key] = row.value })

    const cloudName = config['cloudinary_cloud_name']
    const apiKey = config['cloudinary_api_key']
    const apiSecret = config['cloudinary_api_secret']

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Kredensial Cloudinary belum disetting di Admin Panel.")
    }

    // 2. Siapkan Parameter API & Buat Signature SHA-1
    const timestamp = Math.floor(Date.now() / 1000).toString()
    
    // Rumus Wajib Cloudinary: signature = SHA-1(timestamp=123456789 + api_secret)
    const strToSign = `timestamp=${timestamp}${apiSecret}`
    const msgBuffer = new TextEncoder().encode(strToSign)
    
    // Gunakan globalThis.crypto agar jalan mulus di Cloudflare Edge
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-1', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 3. Masukkan ke FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)

    // 4. Eksekusi Tembak ke API Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`Upload Gagal: ${err.error?.message}`)
    }

    const data = await response.json()
    return data.secure_url
}
