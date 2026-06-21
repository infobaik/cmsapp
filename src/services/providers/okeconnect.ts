import { ProviderCredentials, safeProviderFetch } from './index'

export const executeOkeConnect = async (
  action: string, 
  creds: ProviderCredentials, 
  productCode: string, 
  customerNumber: string, 
  refId: string,
  amount: number = 0 // 🔥 PERBAIKAN: Menangkap parameter amount
) => {
  
  const memberId = creds.key;
  
  let pin = creds.secret;
  let password = "";

  if (creds.secret && creds.secret.includes('|')) {
    const parts = creds.secret.split('|');
    pin = parts[0];
    password = parts[1];
  }

  // 🔥 PERBAIKAN FATAL: Menjadikan QTY Dinamis!
  // Jika amount lebih dari 0 (Bebas Nominal), gunakan amount sebagai qty.
  // Jika 0 (Produk Biasa), gunakan default '1'.
  const qty = amount > 0 ? amount.toString() : '1';

  let baseUrl = creds.endpoint.replace(/\/$/, '');
  if (!baseUrl.endsWith('trx')) {
     baseUrl += '/trx';
  }

  const queryParams = new URLSearchParams({
    product: productCode,
    dest: customerNumber,
    qty: qty, // 👈 QTY SEKARANG SUDAH DINAMIS MENGIKUTI NOMINAL!
    refID: refId,
    memberID: memberId,
    pin: pin,
    password: password
  });

  const targetUrl = `${baseUrl}?${queryParams.toString()}`;

  const result = await safeProviderFetch(creds, null, 'GET', targetUrl);
  
  if (action === 'inquiry') {
     result.bill_amount = result.raw_response?.harga || result.raw_response?.tagihan || 0;
     result.customer_name = result.raw_response?.nama || result.raw_response?.customer_name || 'Pelanggan';
  }

  if (action === 'payment') {
     result.sn = result.raw_response?.sn || result.raw_response?.serial_number || result.raw_response?.ref || '';
  }

  return result;
}
