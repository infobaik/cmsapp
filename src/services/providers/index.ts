import { executeDigiflazz } from './digiflazz'
import { executeOkeConnect } from './okeconnect'

export interface ProviderCredentials {
  endpoint: string;
  key: string;
  secret: string;
  proxy_url: string | null;
}

export const safeProviderFetch = async (
    creds: ProviderCredentials, 
    payload: any, 
    method: string = 'POST',
    customTargetUrl?: string
) => {
    let fetchUrl = customTargetUrl || creds.endpoint;
    let finalPayload = payload;
    
    const headers: Record<string, string> = {};

    // 1. UBAH STRATEGI: Jika metode aslinya GET tapi punya URL Params, 
    // ubah menjadi POST Form-UrlEncoded agar lolos dari blokir CodeIgniter.
    if (method === 'GET' && customTargetUrl && customTargetUrl.includes('?')) {
        const [baseUrl, queryStr] = customTargetUrl.split('?');
        fetchUrl = baseUrl; // Kembalikan ke Base URL (Tanpa '?')
        
        // Ubah format data menjadi Form-UrlEncoded murni
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        finalPayload = queryStr; // Isi Body dengan data Query String (Contoh: product=XXX&dest=YYY)
        method = 'POST'; // Paksa proxy / fetch agar mengirim sebagai POST
    } else {
        headers['Content-Type'] = 'application/json';
    }

    // 2. SKEMA PROXY (Jika digunakan)
    let requestBody: any;
    if (creds.proxy_url) {
        fetchUrl = creds.proxy_url;
        headers['x-relay-auth'] = 'BantarCaringin1'; 
        headers['Content-Type'] = 'application/json'; // Request ke Proxy selalu JSON
        
        requestBody = JSON.stringify({
            target_url: fetchUrl === creds.proxy_url ? (customTargetUrl && !customTargetUrl.includes('?') ? customTargetUrl : creds.endpoint) : fetchUrl,
            target_method: method, // Akan menjadi POST
            target_headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': method === 'POST' && typeof finalPayload === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            target_payload: finalPayload // Berisi string URL Encoded
        });
    } else {
         requestBody = typeof finalPayload === 'string' ? finalPayload : JSON.stringify(finalPayload);
    }

    console.log("\n[DEBUG] ====== OUTGOING REQUEST TO PROVIDER ======");
    console.log("[DEBUG] Target URL:", fetchUrl);
    console.log("[DEBUG] Method    :", method);
    console.log("[DEBUG] Body      :", requestBody);
    console.log("[DEBUG] ==========================================\n");

    try {
        const response = await fetch(fetchUrl, {
            method: creds.proxy_url ? 'POST' : method,
            headers,
            body: requestBody
        });

        const contentType = response.headers.get('content-type') || '';
        const textResponse = await response.text();
        
        console.log("\n[DEBUG] ====== INCOMING RESPONSE METADATA ======");
        console.log("[DEBUG] HTTP Status :", response.status);
        console.log("[DEBUG] Raw Body    :");
        console.log(textResponse);
        console.log("[DEBUG] ========================================\n");

        let data;
        
        if (contentType.includes('application/json')) {
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                data = { raw_text: textResponse };
            }
        } else {
            if (response.ok) {
                data = { raw_text: textResponse };
            } else {
                throw new Error(`API Error (${response.status}): ${textResponse.substring(0, 100)}`);
            }
        }
        
        return { raw_response: data };
        
    } catch (error: any) {
        console.error("\n[DEBUG] XXXXXX PROVIDER FETCH ERROR XXXXXX");
        console.error("[DEBUG] Pesan Error:", error.message);
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
