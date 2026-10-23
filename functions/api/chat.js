// Le cerveau : envoie la conversation à Claude avec les règles et les textes étudiés.
import { checkCode, json } from "../../lib/auth.js";
import { RULES, MODES } from "../../lib/rules.js";
import { TEXTS } from "../../lib/texts.js";

const MAX_TURNS = 30;

function knowledge() {
  if (!TEXTS.length) return "Aucun texte n'a encore été ajouté. Converse avec des mots très fréquents du Coran.";
  return "Textes étudiés :\n\n" + TEXTS.map((t) => `### ${t.title}\n${t.body}`).join("\n\n");
}

export async function onRequestPost({ request, env }) {
  const denied = checkCode(request, env);
  if (denied) return denied;
  if (!env.ANTHROPIC_API_KEY) return json({ error: "La clé ANTHROPIC_API_KEY n'est pas configurée dans Cloudflare." }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Requête invalide." }, 400); }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-MAX_TURNS);
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Le dernier message doit venir de l'élève." }, 400);

  const mode = MODES[body.mode] ? "\n\n" + MODES[body.mode] : "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || "claude-haiku-5-5",
      max_tokens: 500,
      // Les règles et les textes sont mis en cache : ils coûtent beaucoup moins cher à partir du 2e message.
      system: [
        { type: "text", text: RULES + "\n\n" + knowledge(), cache_control: { type: "ephemeral" } },
        ...(mode ? [{ type: "text", text: mode }] : []),
      ],
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.log("Erreur Claude", res.status, detail);
    if (res.status === 401) return json({ error: "La clé API Claude est refusée. Vérifiez-la dans Cloudflare." }, 502);
    if (res.status === 400 && /credit/i.test(detail)) return json({ error: "Le professeur n'a plus de crédits. Rechargez le compte Claude." }, 502);
    if (res.status === 429) return json({ error: "Trop de demandes en même temps. Réessayez dans un instant." }, 502);
    return json({ error: "Le professeur ne répond pas pour le moment. Réessayez." }, 502);
  }

  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  return json({ text });
}
