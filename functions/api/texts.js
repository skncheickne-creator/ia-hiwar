// Liste des titres des textes connus du professeur (sans leur contenu).
import { checkCode, json } from "../../lib/auth.js";
import { TEXTS } from "../../lib/texts.js";

export async function onRequestGet({ request, env }) {
  const denied = checkCode(request, env);
  if (denied) return denied;
  return json({ titles: TEXTS.map((t) => t.title) });
}
