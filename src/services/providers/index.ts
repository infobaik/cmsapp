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
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    let requestBody: any;

    if (creds.proxy_url) {
        fetchUrl = creds.proxy_url;
        headers['x-relay-auth'] = 'BantarCaringin1'; 
        
        requestBody = JSON.stringify({
            target_url: customTargetUrl || creds.endpoint,
            target_method: method,
            target_headers: {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            target_payload: method === 'GET' ? null : payload 
        });
    } else {
        requestBody = method === 'GET' ? undefined : (typeof payload === 'string' ? payload : JSON.stringify(payload));
    }

    console.log("\n[DEBUG] ====== OUTGOING REQUEST TO PROVIDER ======");
    console.log("[DEBUG] Target URL:", customTargetUrl || creds.endpoint);
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
        
        return { 
            raw_response: data,
            server_log: textResponse 
        };
        
    } catch (error: any) {
        console.error("\n[DEBUG] XXXXXX PROVIDER FETCH ERROR XXXXXX");
        console.error("[DEBUG] Pesan Error:", error.message);
        throw new Error(error.message);
    }
}

// 🔥 PERBAIKAN: Menambahkan parameter amount (default 0) di akhir
export const dispatchProviderOrder = async (
    providerName: string,
    action: string,
    creds: ProviderCredentials,
    productCode: string,
    customerNumber: string,
    refId: string,
    amount: number = 0 
) => {
    const provider = providerName.toLowerCase()
    
    if (provider.includes('digiflazz')) {
        return await executeDigiflazz(action, creds, productCode, customerNumber, refId);
    } 
    else if (provider.includes('okeconnect') || provider.includes('orderkuota')) {
        // 🔥 PERBAIKAN: Meneruskan amount ke fungsi OkeConnect
        return await executeOkeConnect(action, creds, productCode, customerNumber, refId, amount);
    }
    
    throw new Error(`Provider ${providerName} belum memiliki logic eksekutor.`);
}
