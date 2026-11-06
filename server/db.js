require("dotenv").config();
const { Pool, types } = require("pg");

// NUMERIC volta como número JS (valores em reais cabem com folga em double)
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL no arquivo .env (veja .env.example).");
  process.exit(1);
}

// Bancos na nuvem (Supabase, Neon, Render...) exigem conexão criptografada.
// Liga sozinho quando o banco não é local; DATABASE_SSL=0 ou 1 força.
const url = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, "");
const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const ssl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL === "1" : !local;
const pool = new Pool({ connectionString: url, ssl: ssl ? { rejectUnauthorized: false } : false, max: process.env.VERCEL ? 3 : 5 });

async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

// Mensagem clara para os erros de conexão mais comuns
function explicarErro(e) {
  const code = e.code || (e.errors && e.errors[0] && e.errors[0].code);
  if (code === "ECONNREFUSED") return "Não consegui conectar no PostgreSQL. Ele está ligado? Confira host e porta no DATABASE_URL do .env.";
  if (code === "28P01") return "Usuário ou senha do banco incorretos. Confira o DATABASE_URL do .env.";
  if (code === "3D000") return "O banco informado no DATABASE_URL não existe. Crie com: CREATE DATABASE obras OWNER obras;";
  if (code === "ENOTFOUND") return "Endereço do banco não encontrado. Confira o host no DATABASE_URL do .env.";
  return e.message || String(e);
}

module.exports = { explicarErro, pool, tx, q: (t, p) => pool.query(t, p) };
