const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const res = await client.query("SELECT valor FROM configuracoes WHERE chave = 'assistente_conhecimento'")
  if (res.rows[0]) {
    console.log(res.rows[0].valor)
  } else {
    console.log('Base vazia')
  }
  await client.end()
}
main().catch(e => console.error(e.message))
