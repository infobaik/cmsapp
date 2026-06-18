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
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (creds.proxy_url) {
        fetchUrl = creds.proxy_url;
        headers['x-relay-auth'] = 'BantarCaringin1'; 
        
        finalPayload = {
            target_url: customTargetUrl || creds.endpoint,
            target_method: method, // Bisa GET atau POST
            target_headers: {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            target_payload: payload
        };
    }

    console.log("\n[DEBUG] ====== OUTGOING REQUEST TO PROVIDER ======");
    console.log("[DEBUG] Target URL:", customTargetUrl || creds.endpoint);
    console.log("[DEBUG] Payload   :", JSON.stringify(finalPayload));
    console.log("[DEBUG] ==========================================\n");

    try {
        const response = await fetch(fetchUrl, {
            method: 'POST', // Ke proxy selalu POST, proxy yang akan mengeksekusi metode aslinya
            headers,
            body: JSON.stringify(finalPayload)
        });

        const contentType = response.headers.get('content-type') || '';
        const textResponse = await response.text();
        
        console.log("\n[DEBUG] ====== INCOMING RESPONSE METADATA ======");
        console.log("[DEBUG] HTTP Status :", response.status);
        console.log("[DEBUG] Raw Body    :");
        console.log(textResponse);
        console.log("[DEBUG] ========================================\n");

        let data;
        
        // PERBAIKAN SAKTI: 
        // Banyak API H2H Otomax membalas pakai XML atau Plain Text (contoh: STATUS=00|SN=123).
        // Kita bungkus respon mentahnya ke JSON jika tidak bisa di-parse agar sistem transaksi tidak crash!
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
