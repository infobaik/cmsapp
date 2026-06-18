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

    if (creds.proxy_url) {
        fetchUrl = creds.proxy_url;
        headers['x-relay-auth'] = 'BantarCaringin1'; 
        
        finalPayload = {
            target_url: creds.endpoint,
            target_method: 'POST',
            target_headers: {
                'Content-Type': 'application/json'
            },
            target_payload: payload
        };
    }

    // ==========================================
    // 🔍 DEBUG 1: LOG REQUEST (YANG DIKIRIM)
    // ==========================================
    console.log("\n[DEBUG] ====== OUTGOING REQUEST TO PROVIDER ======");
    console.log("[DEBUG] Fetch URL :", fetchUrl);
    console.log("[DEBUG] Headers   :", JSON.stringify(headers));
    console.log("[DEBUG] Payload   :", JSON.stringify(finalPayload, null, 2));
    console.log("[DEBUG] ==========================================\n");

    try {
        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(finalPayload)
        });

        const contentType = response.headers.get('content-type') || '';
        
        // ==========================================
        // 🔍 DEBUG 2: LOG RESPONSE METADATA (HTTP STATUS)
        // ==========================================
        console.log("\n[DEBUG] ====== INCOMING RESPONSE METADATA ======");
        console.log("[DEBUG] HTTP Status :", response.status, response.statusText);
        console.log("[DEBUG] Content-Type:", contentType);
        
        // KITA BACA SEBAGAI TEKS DULU AGAR BISA DI-LOG APA ADANYA
        const textResponse = await response.text();
        
        // ==========================================
        // 🔍 DEBUG 3: LOG RAW BODY (JAWABAN SERVER)
        // ==========================================
        console.log("[DEBUG] Raw Body    :");
        console.log(textResponse);
        console.log("[DEBUG] ========================================\n");

        if (!contentType.includes('application/json')) {
            throw new Error(`Respon BUKAN JSON! Status: ${response.status}. Cek Log System untuk detail Raw Body.`);
        }

        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (parseError: any) {
            throw new Error(`Gagal melakukan parse JSON dari respon Provider. Error: ${parseError.message}`);
        }
        
        return { raw_response: data };
        
    } catch (error: any) {
        console.error("\n[DEBUG] XXXXXX PROVIDER FETCH ERROR XXXXXX");
        console.error("[DEBUG] Pesan Error:", error.message);
        console.error("[DEBUG] XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n");
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
    
    console.log(`\n[DEBUG] >>> Dispatching Order | Provider: ${providerName} | Action: ${action} | Code: ${productCode} | Cust: ${customerNumber} | Ref: ${refId}`);

    if (provider.includes('digiflazz')) {
        return await executeDigiflazz(action, creds, productCode, customerNumber, refId);
    } 
    else if (provider.includes('okeconnect') || provider.includes('orderkuota')) {
        return await executeOkeConnect(action, creds, productCode, customerNumber, refId);
    }
    
    throw new Error(`Provider ${providerName} belum memiliki logic eksekutor.`);
}
