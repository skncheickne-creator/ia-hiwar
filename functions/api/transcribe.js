// Les oreilles : transforme l'enregistrement de l'élève en texte arabe (OpenAI).
import { checkCode, json } from "../../lib/auth.js";
import { VOCAB } from "../../lib/texts.js";

const BASE_PROMPT = "Élève débutant qui parle arabe classique, avec des mots du Coran et des textes étudiés.";

// Appelle OpenAI. Le nouveau modèle (gpt-transcribe) reçoit les mots attendus en « keywords » ;
// les anciens modèles les reçoivent dans le « prompt ».
function callOpenAI(env, audio, model, lng, context) {
  const out = new FormData();
  out.append("file", audio, audio.name || "voix.webm");
  out.append("model", model);
  const words = lng === "ar" ? VOCAB.filter((w) => w && !/[<>\r\n]/.test(w)) : [];
  const prompt = (BASE_PROMPT + (context ? " Le professeur vient de dire : " + context : "")).slice(0, 900);
  if (model === "gpt-transcribe") {
    out.append("languages[]", lng);
    for (const w of words) out.append("keywords[]", w);
    out.append("prompt", prompt);
  } else {
    out.append("language", lng);
    out.append("prompt", (prompt + (words.length ? " Mots possibles : " + words.slice(0, 60).join("، ") : "")).slice(0, 1200));
  }
  return fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: out,
  });
}

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

  const lng = form.get("language") === "fr" ? "fr" : "ar";
  const context = typeof form.get("context") === "string" ? form.get("context").slice(0, 600) : "";
  const model = env.TRANSCRIBE_MODEL || "gpt-transcribe";

  let res = await callOpenAI(env, audio, model, lng, context);
  // Si le nouveau modèle refuse la demande, on réessaie avec l'ancien modèle complet.
  if (!res.ok && res.status === 400 && model === "gpt-transcribe") {
    console.log("gpt-transcribe refusé, repli sur gpt-4o-transcribe :", await res.text());
    res = await callOpenAI(env, audio, "gpt-4o-transcribe", lng, context);
  }

  if (!res.ok) {
    console.log("Erreur transcription", res.status, await res.text());
    if (res.status === 401) return json({ error: "La clé API OpenAI est refusée. Vérifiez-la dans Cloudflare." }, 502);
    if (res.status === 429) return json({ error: "Crédits OpenAI épuisés ou trop de demandes. Rechargez ou réessayez." }, 502);
    return json({ error: "Je n'ai pas pu comprendre l'enregistrement. Réessaie." }, 502);
  }
  const data = await res.json();
  return json({ text: (data.text || "").trim() });
}
