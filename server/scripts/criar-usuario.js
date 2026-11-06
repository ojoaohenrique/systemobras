// Cria (ou redefine a senha de) um usuário pelo terminal.
// Uso: npm run criar-usuario -- email@exemplo.com "Nome" admin [senha]
//      perfis: admin | financeiro | engenharia | leitura
// Sem senha, uma senha forte é gerada e mostrada uma única vez.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");

async function main() {
  const [email, nome, perfil = "admin", senhaArg] = process.argv.slice(2);
  if (!email || !nome) {
    console.log('Uso: npm run criar-usuario -- email "Nome" perfil [senha]');
    process.exitCode = 1;
    return;
  }
  if (!["admin", "financeiro", "engenharia", "leitura"].includes(perfil)) throw new Error("Perfil inválido: " + perfil);
  const senha = senhaArg || crypto.randomBytes(9).toString("base64url");
  if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const hash = await bcrypt.hash(senha, 12);
  await pool.query(
    `INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ($1,lower($2),$3,$4)
     ON CONFLICT (email) DO UPDATE SET nome=EXCLUDED.nome, senha_hash=EXCLUDED.senha_hash, perfil=EXCLUDED.perfil, ativo=TRUE`,
    [nome, email, hash, perfil],
  );
  console.log(`Usuário pronto: ${email} (${perfil})`);
  if (!senhaArg) console.log("Senha gerada (anote, não será mostrada de novo): " + senha);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
