import { ProviderCredentials, safeProviderFetch } from './index'

export const executeOkeConnect = async (
  action: string, 
  creds: ProviderCredentials, 
  productCode: string, 
  customerNumber: string, 
  refId: string
) => {
  
  const memberId = creds.key;
  
  // Format pemisahan di Admin: PIN|PASSWORD
  let pin = creds.secret;
  let password = "";

  if (creds.secret && creds.secret.includes('|')) {
    const parts = creds.secret.split('|');
    pin = parts[0];
    password = parts[1];
  }

  // Parameter nominal qty. Biasanya untuk PPOB SKU terdaftar otomatis qty = 1.
  const qty = '1';

  // Menyusun Base URL agar selalu berakhiran /trx
  let baseUrl = creds.endpoint.replace(/\/$/, '');
  if (!baseUrl.endsWith('trx')) {
     baseUrl += '/trx';
  }

  // MEMBANGUN QUERY STRING SEPERTI FORMAT H2H ANDA
  // ?product={produk}&dest={nomor_hp}&qty={nominal}&refID={reff}&memberID={memberID}&pin={pin}&password={password}
  const queryParams = new URLSearchParams({
    product: productCode,
    dest: customerNumber,
    qty: qty,
    refID: refId,
    memberID: memberId,
    pin: pin,
    password: password
  });

  const targetUrl = `${baseUrl}?${queryParams.toString()}`;

  // EKSEKUSI REQUEST GET
  // Kita passing null untuk payload karena data sudah menempel di targetUrl
  const result = await safeProviderFetch(creds, null, 'GET', targetUrl);
  
  // MAPPING HASIL (Berjaga-jaga jika respon berbentuk JSON standar)
  if (action === 'inquiry') {
     result.bill_amount = result.raw_response?.harga || result.raw_response?.tagihan || 0;
     result.customer_name = result.raw_response?.nama || result.raw_response?.customer_name || 'Pelanggan';
  }

  if (action === 'payment') {
     result.sn = result.raw_response?.sn || result.raw_response?.serial_number || result.raw_response?.ref || '';
  }

  return result;
}
