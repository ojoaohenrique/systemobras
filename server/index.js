require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const auth = require("./auth");

const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0));
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
    hsts: process.env.NODE_ENV === "production",
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Proteção contra CSRF: escrita na API só com JSON (formulários de outros sites não conseguem mandar)
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.path !== "/logout" && !req.is("application/json"))
    return res.status(415).json({ erro: "Envie os dados como JSON." });
  next();
});
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(auth.carregarUsuario);

const limitarLogin = rateLimit({
  windowMs: 15 * 60e3,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de login. Espere 15 minutos." },
});
// Diagnóstico rápido: mostra se o servidor está de pé e alcança o banco (sem expor dados)
app.get("/api/saude", async (_req, res) => {
  const { pool, SEM_BANCO, explicarErro } = require("./db");
  if (!process.env.DATABASE_URL) return res.status(500).json({ ok: false, banco: SEM_BANCO });
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, banco: "conectado" });
  } catch (e) {
    res.status(500).json({ ok: false, banco: explicarErro(e) });
  }
});
auth.rotas(app, limitarLogin);
app.use("/api", require("./routes/dados"));
app.use("/api", require("./routes/usuarios"));
app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

app.use(express.static(path.join(__dirname, "..", "public"), { extensions: ["html"] }));

app.use((err, _req, res, _next) => {
  console.error(err);
  const { SEM_BANCO, explicarErro } = require("./db");
  const msg = !process.env.DATABASE_URL ? SEM_BANCO : err.code || (err.errors && err.errors.length) ? explicarErro(err) : "Erro interno no servidor.";
  res.status(500).json({ erro: msg });
});

// Na Vercel o app é exportado e vira uma função; no computador ou no Render, sobe na porta.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Gestão de Obra rodando em http://localhost:${port}`));
}

module.exports = app;
