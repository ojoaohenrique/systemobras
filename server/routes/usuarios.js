const express = require("express");
const bcrypt = require("bcryptjs");
const { q } = require("../db");
const { auditar } = require("../repo");
const { PERFIS, exigirLogin, exigirPerfil } = require("../auth");

const r = express.Router();
r.use(exigirLogin, exigirPerfil("admin"));

r.get("/usuarios", async (_req, res) => {
  const { rows } = await q("SELECT id,nome,email,perfil,ativo,criado_em,ultimo_login FROM usuarios ORDER BY nome");
  res.json({ usuarios: rows, perfis: PERFIS });
});

r.post("/usuarios", async (req, res) => {
  const { nome, email, perfil, senha } = req.body || {};
  if (!nome || !email || !/^[^@\s]+@[^@\s]+$/.test(email)) return res.status(400).json({ erro: "Informe nome e um e-mail válido." });
  if (!PERFIS.includes(perfil)) return res.status(400).json({ erro: "Perfil inválido." });
  if (!senha || String(senha).length < 8) return res.status(400).json({ erro: "A senha precisa ter pelo menos 8 caracteres." });
  try {
    const { rows } = await q(
      "INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ($1,lower($2),$3,$4) RETURNING id,nome,email,perfil,ativo",
      [String(nome).trim(), String(email).trim(), await bcrypt.hash(String(senha), 12), perfil],
    );
    await auditar({ query: q }, req.usuario.id, "criar", "usuarios", String(rows[0].id), null, rows[0]);
    res.json({ ok: true, usuario: rows[0] });
  } catch (e) {
    res.status(400).json({ erro: e.code === "23505" ? "Já existe um usuário com esse e-mail." : e.message });
  }
});

r.patch("/usuarios/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const { rows } = await q("SELECT id,nome,email,perfil,ativo FROM usuarios WHERE id=$1", [id]);
  const antes = rows[0];
  if (!antes) return res.status(404).json({ erro: "Usuário não encontrado." });
  if (id === req.usuario.id && (b.ativo === false || (b.perfil && b.perfil !== "admin")))
    return res.status(400).json({ erro: "Você não pode tirar o próprio acesso de administrador." });
  if (b.perfil && !PERFIS.includes(b.perfil)) return res.status(400).json({ erro: "Perfil inválido." });
  if (b.senha != null && String(b.senha).length < 8) return res.status(400).json({ erro: "A senha precisa ter pelo menos 8 caracteres." });
  const novo = {
    nome: b.nome != null ? String(b.nome).trim() : antes.nome,
    perfil: b.perfil || antes.perfil,
    ativo: b.ativo != null ? !!b.ativo : antes.ativo,
  };
  await q("UPDATE usuarios SET nome=$1, perfil=$2, ativo=$3 WHERE id=$4", [novo.nome, novo.perfil, novo.ativo, id]);
  if (b.senha) await q("UPDATE usuarios SET senha_hash=$1 WHERE id=$2", [await bcrypt.hash(String(b.senha), 12), id]);
  if (!novo.ativo || b.senha || novo.perfil !== antes.perfil) await q("DELETE FROM sessoes WHERE usuario_id=$1", [id]);
  await auditar({ query: q }, req.usuario.id, "editar", "usuarios", String(id), antes, { ...novo, senhaAlterada: !!b.senha });
  res.json({ ok: true });
});

r.get("/auditoria", async (req, res) => {
  const lim = Math.min(Number(req.query.limite) || 200, 1000);
  const { rows } = await q(
    `SELECT a.id,a.acao,a.tabela,a.registro_id,a.em,u.nome usuario,
            COALESCE(a.depois->>'fornecedor', a.antes->>'fornecedor') fornecedor,
            COALESCE(a.depois->>'valor', a.antes->>'valor') valor,
            a.depois->>'quantidade' quantidade, a.depois->>'novos' novos, a.depois->>'modo' modo
     FROM auditoria a LEFT JOIN usuarios u ON u.id=a.usuario_id ORDER BY a.em DESC LIMIT $1`,
    [lim],
  );
  res.json({ eventos: rows });
});

module.exports = r;
