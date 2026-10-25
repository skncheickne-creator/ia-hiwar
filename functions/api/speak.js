// La bouche : lit la réponse du professeur à voix haute (OpenAI).
import { checkCode, json } from "../../lib/auth.js";

// Voix proposées dans l'app (le reste est refusé).
const VOICES = ["cedar", "marin", "ash", "onyx", "verse", "coral", "sage", "shimmer"];

const STYLE =
  "Tu es un professeur d'arabe chaleureux qui discute avec un élève, comme une vraie personne et non comme un robot. " +
  "Parle avec un débit naturel de conversation, ni lent ni pressé, avec une intonation vivante, des pauses naturelles et un ton souriant et encourageant. " +
  "Lis l'arabe en arabe classique (fuṣḥā) en prononçant toutes les voyelles et toutes les lettres correctement.";

// Ne garde que l'arabe : l'aide en français reste affichée à l'écran mais n'est pas lue.
const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const count = (t, re) => (t.match(re) || []).length;
// Un passage surtout en français (même s'il cite un mot arabe) n'est pas lu.
const mostlyArabic = (t) => count(t, /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) >= count(t, /[A-Za-zÀ-ÿœŒ]/g);
const LATIN_RUN = /[A-Za-zÀ-ÖØ-öø-ÿœŒ0-9'’«»"“”][A-Za-zÀ-ÖØ-öø-ÿœŒ0-9'’«»"“” ,;:!?.()\-–—]*/g;
export function arabicOnly(t) {
  return t
    .replace(/✓/g, "")
    .replace(/\([^()]*[A-Za-zÀ-ÿ][^()]*\)/g, " ") // (sens en français)
    .split(/\n+/)
    .map((line) =>
      line
        .split(/(?<=[.!?؟؛:])\s+/)
        .filter((seg) => AR.test(seg) && mostlyArabic(seg))
        .map((seg) => seg.replace(LATIN_RUN, " "))
        .join(" "),
    )
    .filter((line) => AR.test(line) && mostlyArabic(line))
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([،؟!.])/g, "$1")
    .trim();
}

export async function onRequestPost({ request, env }) {
  const denied = checkCode(request, env);
  if (denied) return denied;
  if (!env.OPENAI_API_KEY) return json({ error: "La clé OPENAI_API_KEY n'est pas configurée dans Cloudflare." }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Requête invalide." }, 400); }
  const text = typeof body.text === "string" ? arabicOnly(body.text).slice(0, 1500) : "";
  if (!text) return new Response(null, { status: 204 }); // rien en arabe : pas de son

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
