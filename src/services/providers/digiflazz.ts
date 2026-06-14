export async function processDigiflazzOrder(
  credentials: { endpoint: string, key: string, secret: string }, 
  skuCode: string, 
  customerNumber: string, 
  trxId: string
) {
  // Logic spesifik sesuai dokumentasi API Digiflazz
  const payload = {
    username: credentials.key,
    buyer_sku_code: skuCode,
    customer_no: customerNumber,
    ref_id: trxId,
    // (signature hash di-generate di sini...)
  }

  const response = await fetch(credentials.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  // Parsing response yang berbeda-beda agar seragam saat dikembalikan ke transaction.ts
  if (data.data.status === 'Gagal') {
     throw new Error(data.data.message)
  }

  return {
    success: true,
    sn: data.data.sn,
    raw_response: data
  }
}
