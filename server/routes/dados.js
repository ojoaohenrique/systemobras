const crypto = require("crypto");
const express = require("express");
const { q, tx } = require("../db");
const { paraTela } = require("../scripts/legado");
const { validar, upsert, auditar } = require("../repo");
const { mascarar, podeEditar, vePessoal, exigirLogin, exigirPerfil } = require("../auth");

const r = express.Router();
r.use(exigirLogin);

// Tudo que a tela precisa para abrir: lançamentos, orçamento, cronograma, áreas
r.get("/dados", async (req, res) => {
  const p = req.usuario.perfil;
  const [l, o, c, a] = await Promise.all([
    q("SELECT * FROM lancamentos ORDER BY seq"),
    q("SELECT * FROM orcamento ORDER BY empreendimento, ordem"),
    q("SELECT * FROM cronograma_planejado ORDER BY competencia"),
    q("SELECT valor FROM configuracoes WHERE chave='areas'"),
  ]);
  const orc = {};
  for (const x of o.rows) (orc[x.empreendimento] ||= []).push([x.item, x.maq, x.mat, x.mdo, x.sem_tipo]);
  const pm = [...new Set(c.rows.map((x) => x.competencia))].sort();
  const cmp = {};
  for (const x of c.rows) (cmp[x.item] ||= new Array(pm.length).fill(0))[pm.indexOf(x.competencia)] = x.percentual;
  res.json({
    usuario: { ...req.usuario, vePessoal: vePessoal(p), editaB: podeEditar(p, "B"), editaF: podeEditar(p, "F") },
    rows: l.rows.map(paraTela).map((x) => mascarar(x, p)),
    orc,
    cmp,
    pm,
    areas: (a.rows[0] && a.rows[0].valor) || { l1: 0, l2: 0 },
  });
});

// Grava as mudanças feitas na tela: { upsert: [lançamentos], excluir: [ids] }
r.post("/lancamentos/sync", async (req, res) => {
  const p = req.usuario.perfil;
  const ups = Array.isArray(req.body.upsert) ? req.body.upsert : [];
  const del = Array.isArray(req.body.excluir) ? req.body.excluir.map(String) : [];
  if (ups.length + del.length > 5000) return res.status(413).json({ erro: "Mudanças demais de uma vez." });
  try {
    const out = await tx(async (c) => {
      let n = 0;
      for (const raw of ups) {
        const l = validar(raw);
        const { rows } = await c.query("SELECT * FROM lancamentos WHERE id=$1 FOR UPDATE", [l.id]);
        const antes = rows[0];
        if (!podeEditar(p, l.origem) || (antes && !podeEditar(p, antes.origem)))
          throw Object.assign(new Error("Seu perfil não pode alterar lançamentos de " + nomeOrigem(antes ? antes.origem : l.origem) + "."), { status: 403 });
        await upsert(c, l, req.usuario.id);
        await auditar(c, req.usuario.id, antes ? "editar" : "criar", "lancamentos", l.id, antes || null, l);
        n++;
      }
      for (const id of del) {
        const { rows } = await c.query("DELETE FROM lancamentos WHERE id=$1 RETURNING *", [id]);
        if (!rows[0]) continue;
        if (!podeEditar(p, rows[0].origem))
          throw Object.assign(new Error("Seu perfil não pode excluir lançamentos de " + nomeOrigem(rows[0].origem) + "."), { status: 403 });
        await auditar(c, req.usuario.id, "excluir", "lancamentos", id, rows[0], null);
        n++;
      }
      return n;
    });
    res.json({ ok: true, alterados: out });
  } catch (e) {
    res.status(e.status || 400).json({ erro: e.message });
  }
});

r.put("/config/areas", exigirPerfil("admin", "financeiro", "engenharia"), async (req, res) => {
  const v = { l1: num(req.body.l1), l2: num(req.body.l2) };
  await q(
    "INSERT INTO configuracoes(chave,valor,atualizado_em) VALUES ('areas',$1,now()) ON CONFLICT (chave) DO UPDATE SET valor=EXCLUDED.valor, atualizado_em=now()",
    [JSON.stringify(v)],
  );
  await auditar({ query: q }, req.usuario.id, "editar", "configuracoes", "areas", null, v);
  res.json({ ok: true, areas: v });
});

// Importa os dados que ficaram salvos no navegador (localStorage) do arquivo antigo.
// body: { rows: [...], areas?: {l1,l2}, modo: "adicionar" | "substituir" }
r.post("/importar-legado", exigirPerfil("admin"), async (req, res) => {
  const lista = Array.isArray(req.body.rows) ? req.body.rows : null;
  const modo = req.body.modo === "substituir" ? "substituir" : "adicionar";
  if (!lista || !lista.length) return res.status(400).json({ erro: "Nenhum lançamento encontrado no conteúdo colado." });
  try {
    const out = await tx(async (c) => {
      const chave = (x) =>
        x.origem === "F"
          ? ["F", x.competencia, x.quinzena, x.fornecedor, x.valor].join("|")
          : [x.data, x.fornecedor, x.valor, x.observacao, x.item].join("|");
      const existentes = new Set();
      if (modo === "substituir") await c.query("DELETE FROM lancamentos");
      else (await c.query("SELECT * FROM lancamentos ORDER BY seq")).rows.forEach((x) => existentes.add(chave(x)));
      let novos = 0, repetidos = 0;
      for (const raw of lista) {
        const l = validar({ ...raw, id: crypto.randomUUID() });
        const k = chave(l);
        if (existentes.has(k)) { repetidos++; continue; }
        existentes.add(k);
        await upsert(c, l, req.usuario.id);
        novos++;
      }
      if (req.body.areas && typeof req.body.areas === "object") {
        const v = { l1: num(req.body.areas.l1), l2: num(req.body.areas.l2) };
        await c.query("INSERT INTO configuracoes(chave,valor) VALUES ('areas',$1) ON CONFLICT (chave) DO UPDATE SET valor=EXCLUDED.valor, atualizado_em=now()", [JSON.stringify(v)]);
      }
      await auditar(c, req.usuario.id, "importar", "lancamentos", null, null, { modo, novos, repetidos });
      return { novos, repetidos, modo };
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

const num = (v) => (isFinite(Number(v)) ? Number(v) : 0);
const nomeOrigem = (o) => ({ B: "borderô", F: "folha", E: "equipamentos" })[o] || o;

module.exports = r;
