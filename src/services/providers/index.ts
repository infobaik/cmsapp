import { processDigiflazzOrder } from './digiflazz'
// import { processApigamesOrder } from './apigames'

// Fungsi routing dinamis
export async function dispatchProviderOrder(
  providerName: string, 
  providerCredentials: any, 
  skuCode: string, 
  customerNumber: string, 
  trxId: string
) {
  switch (providerName.toLowerCase()) {
    case 'digiflazz':
      return await processDigiflazzOrder(providerCredentials, skuCode, customerNumber, trxId)
    case 'apigames':
      return await processApigamesOrder(providerCredentials, skuCode, customerNumber, trxId)
    default:
      throw new Error(`Provider module '${providerName}' belum diimplementasikan.`)
  }
}
