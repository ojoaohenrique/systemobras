// Lê o HTML antigo (legado/gestao-de-obra-bordero.html) e extrai os dados
// que estavam escritos no código: lançamentos, folha, equipamentos,
// orçamento e cronograma planejado. Nada do HTML é executado além das
// declarações de dados.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const acorn = require("acorn");

const QUER = new Set(["SEED", "FOL", "ITEMS", "TIPOS", "MES", "mk", "mf", "EQP", "me", "mr", "PM", "CMP", "CMI"]);

function lerLegado(arquivo) {
  arquivo = arquivo || path.join(__dirname, "..", "..", "legado", "gestao-de-obra-bordero.html");
  const html = fs.readFileSync(arquivo, "utf8");
  const js = html.split("<script>")[1].split("</script>")[0];
  const ast = acorn.parse(js, { ecmaVersion: 2022 });
  const partes = [];
  for (const n of ast.body) {
    if (n.type === "VariableDeclaration") {
      for (const d of n.declarations) {
        if (d.id.type === "Identifier" && QUER.has(d.id.name) && d.init)
          partes.push("var " + d.id.name + " = " + js.slice(d.init.start, d.init.end) + ";");
      }
    } else if (
      n.type === "ExpressionStatement" &&
      n.expression.type === "AssignmentExpression" &&
      /^ORC\b/.test(js.slice(n.expression.left.start, n.expression.left.end))
    ) {
      partes.push(js.slice(n.start, n.end) + ";");
    }
  }
  const ctx = { Math, ORC: undefined };
  vm.createContext(ctx);
  vm.runInContext("var ORC;\n" + partes.join("\n"), ctx, { timeout: 2000 });

  // Mesmo estado final que o navegador chegava depois das "migrações" do arquivo
  const rows = ctx.SEED.map(ctx.mk).concat(ctx.FOL.map(ctx.mf)).concat(ctx.EQP.map(ctx.me));
  rows.forEach((r) => {
    r.src = r.src || "B";
    if (r.src === "E" && r.item === "Terraplanagem - Máquinas Aluguel" && r.comp < "2026-02") r.dil = 1;
    r.id = crypto.randomUUID();
  });

  return {
    rows,
    orc: JSON.parse(JSON.stringify(ctx.ORC)),
    cmp: JSON.parse(JSON.stringify(ctx.CMP)),
    pm: ctx.PM.slice(),
  };
}

// objeto da tela (formato do HTML antigo) -> colunas do banco
function paraBanco(r) {
  return {
    id: String(r.id),
    origem: r.src || "B",
    competencia: r.comp,
    data: r.data || null,
    quinzena: r.q != null ? String(r.q) : null,
    fornecedor: r.forn || "",
    documento: r.doc || "",
    valor: r.val == null || r.val === "" ? null : Number(r.val),
    salario: r.sal == null || r.sal === "" ? null : Number(r.sal),
    observacao: r.obs || "",
    item: r.item || "",
    tipo: r.tipo || null,
    informal: r.inf == null ? null : !!r.inf,
    diluir: !!r.dil,
  };
}

// colunas do banco -> objeto da tela
function paraTela(l) {
  const r = {
    id: l.id,
    src: l.origem,
    comp: l.competencia,
    data: l.data || "",
    forn: l.fornecedor,
    doc: l.documento,
    val: l.valor,
    obs: l.observacao,
    item: l.item,
    tipo: l.tipo,
  };
  if (l.quinzena != null) r.q = l.quinzena;
  if (l.salario != null) r.sal = l.salario;
  if (l.informal != null) r.inf = l.informal;
  if (l.diluir) r.dil = 1;
  return r;
}

module.exports = { lerLegado, paraBanco, paraTela };
