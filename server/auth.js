const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { q } = require("./db");
const { auditar } = require("./repo");

const COOKIE = "obras_sessao";
const HORAS = Number(process.env.SESSAO_HORAS || 12);
const HASH_FALSO = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");
const seguro = () => process.env.COOKIE_SECURE === "1" || process.env.NODE_ENV === "production";

// ---- Perfis e permissões -------------------------------------------------
// admin       tudo, inclusive usuários e importação do arquivo antigo
// financeiro  vê e edita tudo, inclusive folha, CPF, PIX e salários
// engenharia  vê e edita borderô e equipamentos; folha aparece sem dados pessoais
// leitura     só consulta; sem dados pessoais nem dados de pagamento
const PERFIS = ["admin", "financeiro", "engenharia", "leitura"];
const vePessoal = (p) => p === "admin" || p === "financeiro";
const podeEditar = (p, origem) =>
  p === "admin" || p === "financeiro" || (p === "engenharia" && (origem === "B" || origem === "E"));

function mascarar(r, perfil) {
  if (vePessoal(perfil)) return r;
  const o = { ...r };
  if (o.src === "F") {
    const m = /\(([^()]*)\)\s*$/.exec(o.forn || "");
    o.forn = "Funcionário" + (m ? " (" + m[1] + ")" : "");
    o.doc = "";
    delete o.sal;
  }
  if (perfil === "leitura") o.doc = "";
  return o;
}

// ---- Sessão --------------------------------------------------------------
async function carregarUsuario(req, _res, next) {
  const t = req.cookies && req.cookies[COOKIE];
  if (!t) return next();
  const { rows } = await q(
    `SELECT u.id,u.nome,u.email,u.perfil FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id
     WHERE s.token_hash=$1 AND s.expira_em>now() AND u.ativo`,
    [hash(t)],
  );
  if (rows[0]) req.usuario = rows[0];
  next();
}

const exigirLogin = (req, res, next) =>
  req.usuario ? next() : res.status(401).json({ erro: "Faça login para continuar." });

const exigirPerfil = (...ps) => (req, res, next) =>
  req.usuario && ps.includes(req.usuario.perfil)
    ? next()
    : res.status(403).json({ erro: "Seu perfil não tem permissão para isso." });

function rotas(app, limitarLogin) {
  app.post("/api/login", limitarLogin, async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");
    const { rows } = await q("SELECT * FROM usuarios WHERE email=$1 AND ativo", [email]);
    const u = rows[0];
    // compara mesmo sem usuário, para não revelar quais e-mails existem pelo tempo de resposta
    const ok = await bcrypt.compare(senha, u ? u.senha_hash : HASH_FALSO);
    if (!u || !ok) return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    const token = crypto.randomBytes(32).toString("base64url");
    await q("INSERT INTO sessoes(token_hash,usuario_id,expira_em) VALUES ($1,$2,now()+($3||' hours')::interval)", [hash(token), u.id, String(HORAS)]);
    await q("UPDATE usuarios SET ultimo_login=now() WHERE id=$1", [u.id]);
    await q("DELETE FROM sessoes WHERE expira_em<now()");
    await auditar({ query: q }, u.id, "login", "usuarios", String(u.id));
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: seguro(), maxAge: HORAS * 3600e3, path: "/" });
    res.json({ ok: true, usuario: { nome: u.nome, email: u.email, perfil: u.perfil } });
  });

  app.post("/api/logout", async (req, res) => {
    const t = req.cookies && req.cookies[COOKIE];
    if (t) await q("DELETE FROM sessoes WHERE token_hash=$1", [hash(t)]);
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  app.get("/api/me", exigirLogin, (req, res) => res.json({ usuario: req.usuario }));

  app.post("/api/me/senha", exigirLogin, async (req, res) => {
    const { atual, nova } = req.body || {};
    if (!nova || String(nova).length < 8) return res.status(400).json({ erro: "A nova senha precisa ter pelo menos 8 caracteres." });
    const { rows } = await q("SELECT senha_hash FROM usuarios WHERE id=$1", [req.usuario.id]);
    if (!(await bcrypt.compare(String(atual || ""), rows[0].senha_hash))) return res.status(400).json({ erro: "Senha atual incorreta." });
    await q("UPDATE usuarios SET senha_hash=$1 WHERE id=$2", [await bcrypt.hash(String(nova), 12), req.usuario.id]);
    // derruba as outras sessões
    await q("DELETE FROM sessoes WHERE usuario_id=$1 AND token_hash<>$2", [req.usuario.id, hash(req.cookies[COOKIE])]);
    await auditar({ query: q }, req.usuario.id, "trocar_senha", "usuarios", String(req.usuario.id));
    res.json({ ok: true });
  });
}

module.exports = { PERFIS, vePessoal, podeEditar, mascarar, carregarUsuario, exigirLogin, exigirPerfil, rotas };
