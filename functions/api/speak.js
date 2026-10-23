// La bouche : lit la réponse du professeur à voix haute (OpenAI).
import { checkCode, json } from "../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const denied = checkCode(request, env);
  if (denied) return denied;
  if (!env.OPENAI_API_KEY) return json({ error: "La clé OPENAI_API_KEY n'est pas configurée dans Cloudflare." }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Requête invalide." }, 400); }
  const text = typeof body.text === "string" ? body.text.replace(/✓/g, "").trim().slice(0, 1500) : "";
  if (!text) return json({ error: "Rien à lire." }, 400);

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.TTS_MODEL || "gpt-4o-mini-tts",
      voice: env.TTS_VOICE || "ash",
      input: text,
      instructions:
        "Tu es un professeur d'arabe qui parle à un débutant. Lis l'arabe en arabe classique (fuṣḥā), lentement et clairement, en prononçant toutes les voyelles. Lis les passages en français avec une prononciation française naturelle.",
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    console.log("Erreur voix", res.status, await res.text());
    return json({ error: "La voix du professeur n'est pas disponible. Lis sa réponse à l'écran." }, 502);
  }
  return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}
