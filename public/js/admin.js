const $ = (s) => document.getElementById(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dt = (s) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const R = (v) => (v == null || v === "" ? "" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
let PERFIS = [], EU = null;

async function api(url, body, method) {
  const r = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  if (r.status === 401) location.href = "/login";
  const j = await r.json().catch(() => ({}));
  if (r.status === 403) {
    document.querySelector(".pg").innerHTML = "<h1>Acesso restrito</h1><p class=mut>Só administradores podem abrir esta tela.</p><p><a href='/'>Voltar</a></p>";
    throw new Error(j.erro);
  }
  if (!r.ok) throw new Error(j.erro || "Erro " + r.status);
  return j;
}
const aviso = (el, t, ok) => {
  el.textContent = t;
  el.className = "msg " + (ok ? "ok" : "err");
};

async function usuarios() {
  const d = await api("/api/usuarios");
  PERFIS = d.perfis;
  $("us").innerHTML = d.usuarios
    .map(
      (u) =>
        `<tr class="${u.ativo ? "" : "inativo"}" data-id="${u.id}"><td>${esc(u.nome)}${u.id === EU ? " <span class=mut>(você)</span>" : ""}</td><td>${esc(u.email)}</td>
        <td><select data-k="perfil">${PERFIS.map((p) => `<option${p === u.perfil ? " selected" : ""}>${p}</option>`).join("")}</select></td>
        <td><input type="checkbox" data-k="ativo"${u.ativo ? " checked" : ""} style="width:auto"></td>
        <td class="mut">${dt(u.ultimo_login)}</td><td><button class="b" data-k="senha">Nova senha</button></td></tr>`,
    )
    .join("");
}

$("us").onchange = async (e) => {
  const tr = e.target.closest("tr"), k = e.target.dataset.k;
  if (!tr || !k) return;
  const v = k === "ativo" ? e.target.checked : e.target.value;
  try {
    await api("/api/usuarios/" + tr.dataset.id, { [k]: v }, "PATCH");
    aviso($("um"), "Usuário atualizado.", true);
  } catch (err) {
    aviso($("um"), err.message);
  }
  usuarios();
};
$("us").onclick = async (e) => {
  const b = e.target.closest("button[data-k=senha]");
  if (!b) return;
  const s = prompt("Nova senha para este usuário (mínimo 8 caracteres):");
  if (!s) return;
  try {
    await api("/api/usuarios/" + b.closest("tr").dataset.id, { senha: s }, "PATCH");
    aviso($("um"), "Senha alterada. Passe a nova senha para a pessoa.", true);
  } catch (err) {
    aviso($("um"), err.message);
  }
};
$("nu").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("/api/usuarios", { nome: $("nn").value, email: $("ne").value, perfil: $("np").value, senha: $("ns").value });
    $("nu").reset();
    aviso($("um"), "Usuário criado.", true);
    usuarios();
    historico();
  } catch (err) {
    aviso($("um"), err.message);
  }
};

$("li").onclick = async () => {
  let d;
  try {
    d = JSON.parse($("lg").value.trim());
    if (Array.isArray(d)) d = { rows: d };
    if (!d || !Array.isArray(d.rows)) throw 0;
  } catch {
    return aviso($("lmsg"), "O conteúdo colado não é válido. Ele deve começar com {\"rows\":[ .");
  }
  const modo = $("lm").value;
  if (modo === "substituir" && !confirm("Isso apaga TODOS os lançamentos atuais e coloca no lugar os " + d.rows.length + " do arquivo. Continuar?")) return;
  try {
    const r = await api("/api/importar-legado", { rows: d.rows, areas: d.areas, modo });
    aviso($("lmsg"), `Pronto: ${r.novos} lançamentos importados, ${r.repetidos} já existiam e foram ignorados.`, true);
    $("lg").value = "";
    historico();
  } catch (err) {
    aviso($("lmsg"), err.message);
  }
};

const ACAO = { criar: "Criou", editar: "Editou", excluir: "Excluiu", importar: "Importou", seed: "Carga inicial", login: "Entrou", trocar_senha: "Trocou a senha" };
async function historico() {
  const d = await api("/api/auditoria?limite=200");
  $("au").innerHTML = d.eventos
    .map((a) => {
      let det = a.tabela === "lancamentos" ? [a.fornecedor, R(a.valor)].filter(Boolean).join(" · ") : a.tabela === "usuarios" ? "usuário #" + a.registro_id : a.tabela === "configuracoes" ? "Áreas loteáveis" : a.tabela || "";
      if (a.acao === "importar") det = `${a.novos} lançamentos (${a.modo})`;
      if (a.acao === "seed") det = `${a.quantidade} lançamentos do arquivo antigo`;
      return `<tr><td class="mut">${dt(a.em)}</td><td>${esc(a.usuario || "sistema")}</td><td>${ACAO[a.acao] || esc(a.acao)}</td><td>${esc(det)}</td></tr>`;
    })
    .join("");
}

(async () => {
  try {
    EU = (await api("/api/me")).usuario.id;
    await usuarios();
    await historico();
  } catch (e) {
    console.error(e);
  }
})();
