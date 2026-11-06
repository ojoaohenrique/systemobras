const $ = (s) => document.getElementById(s);
fetch("/api/me", { credentials: "same-origin" }).then((r) => {
  if (r.status === 401) location.href = "/login";
});
$("f").onsubmit = async (e) => {
  e.preventDefault();
  const msg = $("msg");
  msg.className = "msg";
  if ($("nova").value !== $("nova2").value) {
    msg.textContent = "As duas senhas novas não são iguais.";
    msg.className = "msg err";
    return;
  }
  const r = await fetch("/api/me/senha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ atual: $("atual").value, nova: $("nova").value }),
  });
  const j = await r.json().catch(() => ({}));
  msg.textContent = r.ok ? "Senha alterada." : j.erro || "Erro ao trocar a senha.";
  msg.className = "msg " + (r.ok ? "ok" : "err");
  if (r.ok) $("f").reset();
};
