// Cloudflare Pages Function: принимает действия из мини-приложения и пересылает их в чат журнала.
// Переменные (Cloudflare Pages -> Settings -> Variables and Secrets):
//   TG_BOT_TOKEN, TG_LOG_CHAT_ID, TG_LOG_THREAD_ID   (Telegram)
//   MAX_BOT_TOKEN, MAX_LOG_CHAT_ID                   (MAX)
const enc = new TextEncoder();
const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
// Проверка подлинности initData (одинаковый алгоритм у Telegram и MAX)
async function verify(initData, token) {
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash) return false;
  p.delete("hash");
  const str = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = await hmac(enc.encode("WebAppData"), enc.encode(token));
  const sig = await hmac(secret, enc.encode(str));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("") === hash;
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return new Response("bad", { status: 400 }); }
  const p = b.p, d = String(b.d || ""), t = String(b.t || "").slice(0, 200);
  if (!d || d.length > 4000 || !t || (p !== "tg" && p !== "mx")) return new Response("bad", { status: 400 });

  let user = {};
  try { user = JSON.parse(new URLSearchParams(d).get("user") || "{}"); } catch {}
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Без имени";
  const un = user.username ? ` (@${user.username})` : "";
  const token = p === "tg" ? env.TG_BOT_TOKEN : env.MAX_BOT_TOKEN;
  const chat = p === "tg" ? env.TG_LOG_CHAT_ID : env.MAX_LOG_CHAT_ID;
  if (!token || !chat) return new Response("not configured", { status: 503 });

  const ok = await verify(d, token).catch(() => false);
  if (!ok && p === "tg") return new Response("forbidden", { status: 403 });   // Telegram: только проверенные
  const text = `👤 ${esc(name)}${esc(un)} · ${p === "tg" ? "Telegram" : "MAX"}\n📱 ${esc(t)}${ok ? "" : "\n⚠️ не проверено"}`;

  if (p === "tg") {
    const body = { chat_id: chat, text, parse_mode: "HTML", disable_notification: true };
    if (env.TG_LOG_THREAD_ID) body.message_thread_id = Number(env.TG_LOG_THREAD_ID);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } else {
    await fetch(`https://platform-api.max.ru/messages?chat_id=${encodeURIComponent(chat)}`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ text, format: "html", notify: false }) });
  }
  return new Response("ok");
}
