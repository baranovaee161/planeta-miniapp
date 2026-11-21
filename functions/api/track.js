// Cloudflare Pages Function: принимает действия из мини-приложения и пересылает их в чат журнала.
// Переменные (Cloudflare Pages -> Settings -> Variables and Secrets):
//   TG_BOT_TOKEN, TG_LOG_CHAT_ID, TG_LOG_THREAD_ID   (Telegram)
//   MAX_BOT_TOKEN, MAX_LOG_CHAT_ID                   (MAX)
// Проверка настройки: открыть в браузере  https://ВАШ-САЙТ/api/track        (покажет, какие переменные заданы)
//                     и  https://ВАШ-САЙТ/api/track?test=1                   (пришлёт тестовое сообщение в оба чата)
const enc = new TextEncoder();
const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
const json = (o, status = 200) => new Response(JSON.stringify(o, null, 1), { status, headers: { "content-type": "application/json; charset=utf-8" } });

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

async function sendTg(env, text) {
  if (!env.TG_BOT_TOKEN || !env.TG_LOG_CHAT_ID) return { skipped: "telegram не настроен" };
  const body = { chat_id: env.TG_LOG_CHAT_ID, text, parse_mode: "HTML", disable_notification: true };
  if (env.TG_LOG_THREAD_ID) body.message_thread_id = Number(env.TG_LOG_THREAD_ID);
  const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.ok ? { ok: true } : { error: `telegram ${r.status}: ${(await r.text()).slice(0, 200)}` };
}
async function sendMx(env, text) {
  if (!env.MAX_BOT_TOKEN || !env.MAX_LOG_CHAT_ID) return { skipped: "max не настроен" };
  const r = await fetch(`https://platform-api.max.ru/messages?chat_id=${encodeURIComponent(env.MAX_LOG_CHAT_ID)}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: env.MAX_BOT_TOKEN },
    body: JSON.stringify({ text, format: "html", notify: false }) });
  return r.ok ? { ok: true } : { error: `max ${r.status}: ${(await r.text()).slice(0, 200)}` };
}

export async function onRequestGet({ request, env }) {
  const cfg = { telegram: { token: !!env.TG_BOT_TOKEN, chat: !!env.TG_LOG_CHAT_ID, thread: !!env.TG_LOG_THREAD_ID },
                max: { token: !!env.MAX_BOT_TOKEN, chat: !!env.MAX_LOG_CHAT_ID } };
  if (new URL(request.url).searchParams.get("test") === "1") {
    const t = "✅ Проверка связи: отчёты из мини-приложения работают";
    cfg.test = { telegram: await sendTg(env, t).catch((e) => ({ error: String(e) })), max: await sendMx(env, t).catch((e) => ({ error: String(e) })) };
  }
  return json(cfg);
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return new Response("bad", { status: 400 }); }
  const p = b.p, d = String(b.d || ""), t = String(b.t || "").slice(0, 200);
  if (!t || !["tg", "mx", "web"].includes(p)) return new Response("bad", { status: 400 });

  // Посетители «по ссылке» (сайт, ВКонтакте и т.д.): без подписи, но только со страницы самого приложения
  if (p === "web") {
    const o = request.headers.get("Origin");
    if (o && o !== new URL(request.url).origin) return new Response("forbidden", { status: 403 });
    const v = esc(String(b.v || "anon").slice(0, 12));
    const text = `👤 Посетитель по ссылке · #${v}\n📱 ${esc(t)}`;
    const r = await Promise.all([sendTg(env, text).catch(() => ({})), sendMx(env, text).catch(() => ({}))]);
    return json(r);
  }

  if (!d || d.length > 4000) return new Response("bad", { status: 400 });
  let user = {};
  try { user = JSON.parse(new URLSearchParams(d).get("user") || "{}"); } catch {}
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Без имени";
  const un = user.username ? ` (@${user.username})` : "";
  const token = p === "tg" ? env.TG_BOT_TOKEN : env.MAX_BOT_TOKEN;
  if (!token) return new Response("not configured", { status: 503 });
  const ok = await verify(d, token).catch(() => false);
  if (!ok && p === "tg") return new Response("forbidden", { status: 403 });   // Telegram: только проверенные
  const text = `👤 ${esc(name)}${esc(un)} · ${p === "tg" ? "Telegram" : "MAX"}\n📱 ${esc(t)}${ok ? "" : "\n⚠️ не проверено"}`;
  const res = p === "tg" ? await sendTg(env, text) : await sendMx(env, text);
  return json(res, res.error ? 502 : 200);
}
