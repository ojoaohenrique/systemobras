const { paraBanco } = require("./scripts/legado");

const COLS = ["id", "origem", "competencia", "data", "quinzena", "fornecedor", "documento", "valor", "salario", "observacao", "item", "tipo", "informal", "diluir"];

// Valida e normaliza um lançamento vindo da tela. Lança erro com mensagem amigável.
function validar(r) {
  const l = paraBanco(r);
  if (!l.id || l.id.length > 64) throw new Error("Lançamento sem id válido.");
  if (!["B", "F", "E"].includes(l.origem)) throw new Error("Origem inválida: " + l.origem);
  if (!/^\d{4}-\d{2}$/.test(l.competencia || "")) throw new Error("Competência inválida: " + l.competencia);
  if (l.data && !/^\d{4}-\d{2}-\d{2}/.test(l.data)) throw new Error("Data inválida: " + l.data);
  if (l.valor != null && !isFinite(l.valor)) throw new Error("Valor inválido.");
  if (l.tipo && !["MAT", "MDO", "MAQ"].includes(l.tipo)) l.tipo = null;
  for (const k of ["fornecedor", "documento", "observacao", "item"]) l[k] = String(l[k] || "").slice(0, 500);
  return l;
}

async function upsert(c, l, usuarioId) {
  const vals = COLS.map((k) => l[k]);
  const ph = COLS.map((_, i) => "$" + (i + 1)).join(",");
  const set = COLS.slice(1).map((k) => k + "=EXCLUDED." + k).join(",");
  await c.query(
    `INSERT INTO lancamentos (${COLS.join(",")},criado_por,atualizado_por) VALUES (${ph},$${COLS.length + 1},$${COLS.length + 1})
     ON CONFLICT (id) DO UPDATE SET ${set}, atualizado_por=EXCLUDED.atualizado_por, atualizado_em=now()`,
    [...vals, usuarioId || null],
  );
}

async function auditar(c, usuarioId, acao, tabela, registroId, antes, depois) {
  await c.query(
    "INSERT INTO auditoria (usuario_id,acao,tabela,registro_id,antes,depois) VALUES ($1,$2,$3,$4,$5,$6)",
    [usuarioId || null, acao, tabela || null, registroId || null, antes ? JSON.stringify(antes) : null, depois ? JSON.stringify(depois) : null],
  );
}

module.exports = { COLS, validar, upsert, auditar };
