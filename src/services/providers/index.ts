import { executeDigiflazz } from './digiflazz'
import { executeOkeConnect } from './okeconnect'

export interface ProviderCredentials {
  endpoint: string;
  key: string;
  secret: string;
  proxy_url: string | null;
}

export const safeProviderFetch = async (creds: ProviderCredentials, payload: any) => {
    const targetUrl = creds.endpoint;
    const fetchUrl = creds.proxy_url ? creds.proxy_url : targetUrl;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (creds.proxy_url) {
        headers['X-Target-Url'] = targetUrl;
    }

    try {
        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return { raw_response: data };
    } catch (error: any) {
        throw new Error(`Gagal menghubungi Endpoint/Proxy: ${error.message}`);
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
