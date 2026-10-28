// Lancé par Cloudflare à chaque mise en ligne : rassemble les fichiers du dossier « textes »
// dans lib/texts.js, pour que le professeur les connaisse. Les textes ne sont pas publics.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

const dir = "textes";
const files = existsSync(dir)
  ? readdirSync(dir)
      .filter((f) => [".md", ".markdown", ".txt"].includes(extname(f).toLowerCase()))
      .filter((f) => !f.startsWith("_") && !/^readme/i.test(f))
      .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
  : [];

const texts = files.map((f) => {
  const body = readFileSync(join(dir, f), "utf8").replace(/^﻿/, "").replace(/\r/g, "").trim();
  const heading = body.match(/^#\s+(.+)$/m);
  const title = (heading ? heading[1] : basename(f, extname(f)).replace(/[_-]+/g, " "))
    .replace(/[*_`]+/g, "").replace(/\s+/g, " ").trim();
  return { title, body };
});

// Mots que la reconnaissance vocale doit s'attendre à entendre : mots de la leçon + mots les plus présents dans les textes.
const APP_WORDS = ["مراجعة", "مرادف", "مرادفات", "مضاد", "أضداد", "مصدر", "جمع", "مفرد", "فعل", "اسم", "حرف",
  "ماض", "مضارع", "أمر", "سؤال", "أسئلة", "نص", "النصوص", "قصة", "كلمة", "كلمات", "معنى", "ترجمة", "جملة"];
const plain = (w) => w.normalize("NFC")
  .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "") // voyelles, signes coraniques, tatwil
  .replace(/\u0671/g, "\u0627"); // alif wasla → alif
const counts = new Map();
for (const t of texts) {
  for (const raw of t.body.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g) || []) {
    const w = plain(raw).replace(/[^\u0621-\u064A]/g, "");
    if (w.length >= 3) counts.set(w, (counts.get(w) || 0) + 1);
  }
}
const textWords = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
const VOCAB = [...new Set([...APP_WORDS, ...textWords])].slice(0, 150);

writeFileSync(
  "lib/texts.js",
  "// Fichier généré automatiquement par scripts/build-texts.mjs — ne pas modifier à la main.\n" +
    "export const TEXTS = " + JSON.stringify(texts, null, 2) + ";\n" +
    "export const VOCAB = " + JSON.stringify(VOCAB) + ";\n",
);
console.log(`${texts.length} texte(s) chargé(s) : ${texts.map((t) => t.title).join(", ") || "aucun"} — ${VOCAB.length} mots pour l'écoute`);
