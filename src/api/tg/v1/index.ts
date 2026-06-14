import { Hono } from 'hono'

const app = new Hono()

// Middleware Telegram API Key
app.use('/*', async (c, next) => {
  const tgToken = c.req.header('x-tg-token')
  
  // (Logika pengecekan token ke database/KV sama seperti WA)
  if (!tgToken) return c.json({ error: 'Telegram Token missing' }, 401)
  
  await next()
})

// Endpoint Action: Cek Saldo via Bot Telegram
app.get('/balance', async (c) => {
  // Asumsi token valid dan kita mendapatkan userId
  const mockUserId = 1 
  
  const wallet = await c.env.DB.prepare(`SELECT balance_available FROM wallets WHERE user_id = ?`).bind(mockUserId).first()
  
  return c.json({
    message: "Saldo Anda saat ini",
    balance: wallet ? wallet.balance_available : 0,
    currency: "IDR"
  })
})

export default app
