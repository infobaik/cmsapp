import crypto from 'node:crypto'
import { ProviderCredentials, safeProviderFetch } from './index'

export const executeOkeConnect = async (
  action: string, 
  creds: ProviderCredentials, 
  productCode: string, 
  customerNumber: string, 
  refId: string
) => {
  
  // Berdasarkan dokumentasi OkeConnect / OrderKuota:
  // Kredensial mereka menggunakan MemberID dan PIN/API Secret.
  const memberId = creds.key;
  const pin = creds.secret;
  
  // Format md5(MemberID + PIN + ref_id)
  const signString = memberId + pin + refId;
  const signature = crypto.createHash('md5').update(signString).digest('hex');

  const payload = {
    memberID: memberId,
    product: productCode,
    dest: customerNumber,
    refID: refId,
    sign: signature
  };

  // Gunakan safeProviderFetch agar langsung tertaut ke Proxy Universal jika dibutuhkan
  const result = await safeProviderFetch(creds, payload);
  
  return result;
}
