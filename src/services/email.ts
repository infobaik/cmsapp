export async function sendBrevoEmail(db: D1Database, toEmail: string, orderId: string, productName: string, snCode: string, status: string) {
  if (!toEmail) return;
  
  try {
    const setting = await db.prepare(`SELECT value FROM system_settings WHERE key = 'brevo_api_key'`).first();
    if (!setting || !setting.value) return; // Abaikan jika admin belum memasukkan API Key

    let badgeColor = status === 'SUKSES' ? '#10b981' : (status === 'PROSES' ? '#f59e0b' : '#ef4444');
    
    let htmlContent = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #18181b; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Pesanan Anda: <span style="color: ${badgeColor};">${status}</span></h1>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #3f3f46;">
          <p style="font-size: 16px;">Halo,</p>
          <p>Terima kasih telah menggunakan layanan kami. Berikut adalah rincian pesanan Anda:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>ID Pesanan</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${orderId}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Produk</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${productName}</td></tr>
          </table>
    `;

    if (snCode) {
      htmlContent += `
          <div style="background-color: #f0fdf4; border: 1px dashed #22c55e; padding: 20px; border-radius: 12px; text-align: center; margin-top: 24px;">
            <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: bold;">KODE VOUCHER / SERIAL NUMBER (SN)</p>
            <h2 style="margin: 0; color: #15803d; font-family: monospace; font-size: 24px; word-break: break-all;">${snCode}</h2>
          </div>
      `;
    } else if (status === 'PROSES') {
      htmlContent += `<p style="text-align: center; color: #71717a; font-size: 14px; margin-top: 24px;"><em>Pesanan sedang diproses oleh sistem. Kami akan mengirimkan email lanjutan beserta Kode SN Anda.</em></p>`;
    }

    htmlContent += `
        </div>
      </div>
    `;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': setting.value as string, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: "Sistem Transaksi", email: "no-reply@domainanda.com" }, // Ganti dengan email domain Anda
        to: [{ email: toEmail }],
        subject: `[${status}] Pesanan ${productName} - ${orderId}`,
        htmlContent: htmlContent
      })
    });
  } catch (error) {
    console.error("Gagal mengirim email Brevo:", error);
  }
}
