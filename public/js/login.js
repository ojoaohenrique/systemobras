fetch("/api/me", { credentials: "same-origin" }).then((r) => {
  if (r.ok) location.href = "/";
});
document.getElementById("f").onsubmit = async (e) => {
  e.preventDefault();
  const msg = document.getElementById("msg"), btn = document.getElementById("ok");
  msg.className = "msg";
  btn.disabled = true;
  btn.textContent = "Entrando…";
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: document.getElementById("email").value, senha: document.getElementById("senha").value }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || "Não foi possível entrar.");
    location.href = "/";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg err";
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
};
