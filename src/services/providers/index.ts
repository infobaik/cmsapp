import { executeDigiflazz } from './digiflazz'
import { executeOkeConnect } from './okeconnect'

export interface ProviderCredentials {
  endpoint: string;
  key: string;
  secret: string;
  proxy_url: string | null;
}

export const safeProviderFetch = async (creds: ProviderCredentials, payload: any) => {
    let fetchUrl = creds.endpoint;
    let finalPayload = payload;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    // JIKA MENGGUNAKAN PROXY, KITA BUNGKUS PAYLOAD SESUAI SKEMA EXPRESS.JS ANDA
    if (creds.proxy_url) {
        fetchUrl = creds.proxy_url;
        
        // 1. Masukkan otentikasi wajib proxy Anda
        // Idealnya diambil dari env, tapi kita hardcode fallback sesuai proxy Anda
        headers['x-relay-auth'] = 'BantarCaringin1'; 

        // 2. Bungkus payload sesuai dengan ekspektasi req.body di server proxy
        finalPayload = {
            target_url: creds.endpoint,
            target_method: 'POST',
            target_headers: {
                'Content-Type': 'application/json'
            },
            target_payload: payload
        };
    }

    try {
        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(finalPayload)
        });

        // Cek tipe konten yang dikembalikan
        const contentType = response.headers.get('content-type') || '';
        
        // Jika respons bukan JSON (misal HTML dari Render / Cloudflare)
        if (!contentType.includes('application/json')) {
            const textResponse = await response.text();
            throw new Error(`Respon Non-JSON (Status ${response.status}). Cek Log Render.com Anda. Cuplikan: ${textResponse.substring(0, 150)}`);
        }

        const data = await response.json();
        return { raw_response: data };
        
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export const dispatchProviderOrder = async (
    providerName: string,
    action: string,
    creds: ProviderCredentials,
    productCode: string,
    customerNumber: string,
    refId: string
) => {
    const provider = providerName.toLowerCase()
    
    if (provider.includes('digiflazz')) {
        return await executeDigiflazz(action, creds, productCode, customerNumber, refId);
    } 
    else if (provider.includes('okeconnect') || provider.includes('orderkuota')) {
        return await executeOkeConnect(action, creds, productCode, customerNumber, refId);
    }
    
    throw new Error(`Provider ${providerName} belum memiliki logic eksekutor.`);
}
