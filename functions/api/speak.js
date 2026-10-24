// La bouche : lit la réponse du professeur à voix haute (OpenAI).
import { checkCode, json } from "../../lib/auth.js";

// Voix proposées dans l'app (le reste est refusé).
const VOICES = ["cedar", "marin", "ash", "onyx", "verse", "coral", "sage", "shimmer"];

const STYLE =
  "Tu es un professeur d'arabe chaleureux qui discute avec un élève, comme une vraie personne et non comme un robot. " +
  "Parle avec un débit naturel de conversation, ni lent ni pressé, avec une intonation vivante, des pauses naturelles et un ton souriant et encourageant. " +
  "Lis l'arabe en arabe classique (fuṣḥā) en prononçant toutes les voyelles et toutes les lettres correctement. " +
  "Lis les passages en français avec une prononciation française naturelle.";

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
      voice: VOICES.includes(body.voice) ? body.voice : env.TTS_VOICE || "cedar",
      input: text,
      instructions: STYLE,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    console.log("Erreur voix", res.status, await res.text());
    return json({ error: "La voix du professeur n'est pas disponible. Lis sa réponse à l'écran." }, 502);
  }
  return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}
