// Aplica os arquivos de server/migrations em ordem (uma vez cada).
const fs = require("fs");
const path = require("path");
const { pool, tx } = require("../db");

async function migrate() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (versao TEXT PRIMARY KEY, aplicada TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  const dir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await pool.query("SELECT versao FROM schema_migrations");
  const done = new Set(rows.map((r) => r.versao));
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    await tx(async (c) => {
      await c.query(sql);
      await c.query("INSERT INTO schema_migrations(versao) VALUES ($1)", [f]);
    });
    console.log("Migração aplicada:", f);
  }
  console.log("Banco atualizado.");
}

if (require.main === module) {
  migrate()
    .catch((e) => {
      console.error(require("../db").explicarErro(e));
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
module.exports = migrate;
