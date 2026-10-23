// Les oreilles : transforme l'enregistrement de l'élève en texte arabe (OpenAI).
import { checkCode, json } from "../../lib/auth.js";

const MAX_BYTES = 8 * 1024 * 1024; // environ 2 minutes de parole

export async function onRequestPost({ request, env }) {
  const denied = checkCode(request, env);
  if (denied) return denied;
  if (!env.OPENAI_API_KEY) return json({ error: "La clé OPENAI_API_KEY n'est pas configurée dans Cloudflare." }, 500);

  let form;
  try { form = await request.formData(); } catch { return json({ error: "Enregistrement illisible." }, 400); }
  const audio = form.get("audio");
  if (!audio || typeof audio === "string" || !audio.size) return json({ error: "Aucun son reçu." }, 400);
  if (audio.size > MAX_BYTES) return json({ error: "Enregistrement trop long. Parle en phrases plus courtes." }, 413);

  const out = new FormData();
  out.append("file", audio, audio.name || "voix.webm");
  out.append("model", env.TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  out.append("language", form.get("language") === "fr" ? "fr" : "ar");
  out.append("prompt", "Élève débutant qui parle arabe classique, avec des mots du Coran.");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: out,
  });

  if (!res.ok) {
    console.log("Erreur transcription", res.status, await res.text());
    if (res.status === 401) return json({ error: "La clé API OpenAI est refusée. Vérifiez-la dans Cloudflare." }, 502);
    if (res.status === 429) return json({ error: "Crédits OpenAI épuisés ou trop de demandes. Rechargez ou réessayez." }, 502);
    return json({ error: "Je n'ai pas pu comprendre l'enregistrement. Réessaie." }, 502);
  }
  const data = await res.json();
  return json({ text: (data.text || "").trim() });
}
