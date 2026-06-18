import crypto from 'node:crypto'
import { ProviderCredentials, safeProviderFetch } from './index'

export const executeDigiflazz = async (
  action: string, 
  creds: ProviderCredentials, 
  productCode: string, 
  customerNumber: string, 
  refId: string
) => {
  
  const username = creds.key;
  const secret = creds.secret;
  
  // MD5 Signature: username + secret + refId
  const signString = username + secret + refId;
  const signature = crypto.createHash('md5').update(signString).digest('hex');

  // Payload standarisasi Digiflazz
  const payload = {
    username: username,
    buyer_sku_code: productCode,
    customer_no: customerNumber,
    ref_id: refId,
    sign: signature
  };

  // Kirim payload menggunakan fungsi Universal Forwarder
  const result = await safeProviderFetch(creds, payload);
  
  return result;
}
