import md5 from 'md5'

interface DigiflazzCredentials {
  endpoint: string; // https://api.digiflazz.com/v1
  key: string;      // username
  secret: string;   // production/development key
}

// 1. CEK SALDO
export async function checkDigiflazzBalance(cred: DigiflazzCredentials) {
  const sign = md5(cred.key + cred.secret + "depo");
  
  const payload = {
    cmd: "deposit",
    username: cred.key,
    sign: sign
  };

  const response = await fetch(`${cred.endpoint}/cek-saldo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const rawData = await response.json();
  
  return {
    success: true,
    raw_response: rawData 
  };
}

// 2. TRANSAKSI PRABAYAR (Pulsa, Game, e-Money)
export async function processPrepaidDigiflazz(
  cred: DigiflazzCredentials, 
  skuCode: string, 
  customerNumber: string, 
  trxId: string
) {
  const sign = md5(cred.key + cred.secret + trxId);

  const payload = {
    username: cred.key,
    buyer_sku_code: skuCode,
    customer_no: customerNumber,
    ref_id: trxId,
    sign: sign
  };

  const response = await fetch(`${cred.endpoint}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const rawData = await response.json();

  if (rawData.data?.status === 'Gagal') {
     throw new Error(JSON.stringify(rawData)); 
  }

  return {
    success: true,
    sn: rawData.data?.sn || '',
    raw_response: rawData 
  };
}

// 3. PASCABAYAR: INQUIRY (Cek Tagihan)
export async function inquiryPostpaidDigiflazz(
  cred: DigiflazzCredentials, 
  skuCode: string, 
  customerNumber: string, 
  trxId: string
) {
  const sign = md5(cred.key + cred.secret + trxId);

  const payload = {
    commands: "inq-pasca",
    username: cred.key,
    buyer_sku_code: skuCode,
    customer_no: customerNumber,
    ref_id: trxId,
    sign: sign
  };

  const response = await fetch(`${cred.endpoint}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const rawData = await response.json();

  if (rawData.data?.status === 'Gagal') {
     throw new Error(JSON.stringify(rawData));
  }

  return {
    success: true,
    customer_name: rawData.data?.customer_name,
    bill_amount: rawData.data?.price, 
    raw_response: rawData
  };
}

// 4. PASCABAYAR: PAYMENT (Bayar Tagihan)
export async function payPostpaidDigiflazz(
  cred: DigiflazzCredentials, 
  skuCode: string, 
  customerNumber: string, 
  trxId: string
) {
  const sign = md5(cred.key + cred.secret + trxId);

  const payload = {
    commands: "pay-pasca",
    username: cred.key,
    buyer_sku_code: skuCode,
    customer_no: customerNumber,
    ref_id: trxId,
    sign: sign
  };

  const response = await fetch(`${cred.endpoint}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const rawData = await response.json();

  if (rawData.data?.status === 'Gagal') {
     throw new Error(JSON.stringify(rawData));
  }

  return {
    success: true,
    sn: rawData.data?.sn,
    raw_response: rawData
  };
}

// 5. PULL PRICE LIST (Untuk Sinkronisasi)
export async function getDigiflazzPriceList(cred: DigiflazzCredentials, type: 'prepaid' | 'pasca') {
  const sign = md5(cred.key + cred.secret + "pricelist");
  
  const payload = {
    cmd: type,
    username: cred.key,
    sign: sign
  };

  const response = await fetch(`${cred.endpoint}/price-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const rawData = await response.json();
  
  return rawData;
}
