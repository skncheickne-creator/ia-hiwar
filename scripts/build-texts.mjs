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
  const title = (heading ? heading[1] : basename(f, extname(f)).replace(/[_-]+/g, " ")).trim();
  return { title, body };
});

writeFileSync(
  "lib/texts.js",
  "// Fichier généré automatiquement par scripts/build-texts.mjs — ne pas modifier à la main.\n" +
    "export const TEXTS = " + JSON.stringify(texts, null, 2) + ";\n",
);
console.log(`${texts.length} texte(s) chargé(s) : ${texts.map((t) => t.title).join(", ") || "aucun"}`);
