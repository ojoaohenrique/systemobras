// Carrega a sessão e os dados antes de montar as telas.
(async () => {
  let d;
  try {
    const r = await fetch("/api/dados", { credentials: "same-origin" });
    if (r.status === 401) return (location.href = "/login");
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro || "Erro " + r.status);
    d = await r.json();
  } catch (e) {
    document.getElementById("boot").textContent = "Não foi possível carregar os dados: " + e.message;
    return;
  }
  window.__D = d;
  const u = d.usuario;
  if (!u.editaB) document.body.classList.add("ro-B");
  if (!u.editaF) document.body.classList.add("ro-F");

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const bar = document.getElementById("usr");
  bar.innerHTML =
    "<b>" + esc(u.nome) + "</b><span class=pf>" + esc(u.perfil) + "</span>" +
    (u.vePessoal ? "" : "<span>dados pessoais da folha ocultos</span>") +
    "<span class=svst id=svst>Dados do servidor</span>" +
    (u.perfil === "admin" ? "<a href='/admin'>Usuários e importação</a>" : "") +
    "<a href='/senha'>Trocar senha</a><button id=sair>Sair</button>";
  document.getElementById("sair").onclick = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    location.href = "/login";
  };

  const s = document.createElement("script");
  s.src = "/js/app.js";
  s.onload = () => document.body.classList.remove("carregando");
  s.onerror = () => (document.getElementById("boot").textContent = "Erro ao carregar o sistema.");
  document.body.appendChild(s);
})();
