// Cloudflare Pages Function: заявка на запись в «Островок» из мини-приложения.
// Переменные: TG_BOT_TOKEN, TG_LOG_CHAT_ID, TG_APPLY_THREAD_ID (необязательно; иначе TG_LOG_THREAD_ID),
//             MAX_BOT_TOKEN, MAX_LOG_CHAT_ID
const enc = new TextEncoder();
const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
async function verify(initData, token) {
  const p = new URLSearchParams(initData); const hash = p.get("hash"); if (!hash) return false; p.delete("hash");
  const str = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = await hmac(enc.encode("WebAppData"), enc.encode(token));
  const sig = await hmac(secret, enc.encode(str));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("") === hash;
}
async function sendTg(env, text) {
  if (!env.TG_BOT_TOKEN || !env.TG_LOG_CHAT_ID) return { skipped: true };
  const body = { chat_id: env.TG_LOG_CHAT_ID, text, parse_mode: "HTML" };
  const th = env.TG_APPLY_THREAD_ID || env.TG_LOG_THREAD_ID;
  if (th) body.message_thread_id = Number(th);
  const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.ok ? { ok: true } : { error: `telegram ${r.status}` };
}
async function sendMx(env, text) {
  if (!env.MAX_BOT_TOKEN || !env.MAX_LOG_CHAT_ID) return { skipped: true };
  const r = await fetch(`https://platform-api.max.ru/messages?chat_id=${encodeURIComponent(env.MAX_LOG_CHAT_ID)}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: env.MAX_BOT_TOKEN }, body: JSON.stringify({ text, format: "html" }) });
  return r.ok ? { ok: true } : { error: `max ${r.status}` };
}
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return new Response("bad", { status: 400 }); }
  const p = b.p, name = String(b.name || "").trim().slice(0, 120), phone = String(b.phone || "").trim().slice(0, 30);
  const date = String(b.date || ""), time = String(b.time || ""), label = String(b.label || "").slice(0, 80);
  if (!["tg", "mx", "web"].includes(p) || name.length < 2 || phone.replace(/\D/g, "").length < 10 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return new Response("bad", { status: 400 });
  let src = "Сайт (по ссылке)", user = "";
  if (p === "web") {
    const o = request.headers.get("Origin");
    if (o && o !== new URL(request.url).origin) return new Response("forbidden", { status: 403 });
  } else {
    const d = String(b.d || ""); const token = p === "tg" ? env.TG_BOT_TOKEN : env.MAX_BOT_TOKEN;
    if (!d || !token) return new Response("bad", { status: 400 });
    const ok = await verify(d, token).catch(() => false);
    if (!ok && p === "tg") return new Response("forbidden", { status: 403 });
    let u = {}; try { u = JSON.parse(new URLSearchParams(d).get("user") || "{}"); } catch {}
    user = `\n💬 ${p === "tg" ? "Telegram" : "MAX"}: ${esc([u.first_name, u.last_name].filter(Boolean).join(" "))}${u.username ? " (@" + esc(u.username) + ")" : ""}`;
    src = p === "tg" ? "Мини-приложение · Telegram" : "Мини-приложение · MAX";
  }
  const text = `🧸 <b>ЗАПИСЬ В «ОСТРОВОК»</b>\n👤 ${esc(name)}\n📞 ${esc(phone)}\n📅 ${esc(label || date + " " + time)}${user}\n🔗 Источник: ${src}\n\n#заявка #островок`;
  const res = await Promise.all([sendTg(env, text).catch((e) => ({ error: String(e) })), sendMx(env, text).catch((e) => ({ error: String(e) }))]);
  const sent = res.some((r) => r.ok);
  return new Response(JSON.stringify(res), { status: sent ? 200 : 502, headers: { "content-type": "application/json" } });
}
