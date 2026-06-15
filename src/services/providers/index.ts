import { processPrepaidDigiflazz, inquiryPostpaidDigiflazz, payPostpaidDigiflazz } from './digiflazz'

export async function dispatchProviderOrder(
  providerName: string, 
  command: 'payment' | 'inquiry',
  providerCredentials: any, 
  skuCode: string, 
  customerNumber: string, 
  trxId: string
) {
  switch (providerName.toLowerCase()) {
    case 'digiflazz':
      // Tentukan logika berdasarkan skuCode (biasanya Pasca memiliki akhiran khusus, atau ditentukan oleh sistem)
      // Di sini kita asumsikan dispatcher mendeteksi tipe dari parameter command:
      if (command === 'inquiry') {
        return await inquiryPostpaidDigiflazz(providerCredentials, skuCode, customerNumber, trxId)
      } else {
        // Asumsi fallback payment: Anda bisa mendeteksi tipe produk prepaid vs postpaid di level pemanggil
        return await processPrepaidDigiflazz(providerCredentials, skuCode, customerNumber, trxId)
      }
    default:
      throw new Error(`Provider module '${providerName}' belum diimplementasikan.`)
  }
}
