# Ḥiwār — parler arabe avec un professeur IA

Web app où l'élève parle en arabe au micro ; le professeur (Claude) lui répond à voix haute en s'appuyant sur les textes étudiés en vidéo.

## Comment ça marche

1. L'élève parle → `/api/transcribe` transforme sa voix en texte (OpenAI).
2. `/api/chat` envoie la conversation au professeur (Claude), avec les règles (`lib/rules.js`) et les textes (`textes/`).
3. `/api/speak` lit la réponse à voix haute (OpenAI).

Les clés API restent sur le serveur Cloudflare : elles ne sont jamais dans le code ni dans le navigateur.

## Ajouter un texte

1. Sur GitHub, ouvrez le dossier `textes`, puis **Add file > Upload files**.
2. Déposez vos fichiers `.md` (ou `.txt`), un texte par fichier. Modèle : `textes/_modele.md`.
3. Cliquez sur **Commit changes**. Cloudflare remet l'app en ligne en une à deux minutes, et le professeur connaît le nouveau texte.

Les fichiers dont le nom commence par `_` sont ignorés.

## Mise en ligne sur Cloudflare (une seule fois)

1. Tableau de bord Cloudflare → **Workers & Pages** → **Create** → onglet **Pages** → **Connect to Git** → choisissez `ia-hiwar`.
2. Réglages de build :
   - Framework preset : **None**
   - Build command : `node scripts/build-texts.mjs`
   - Build output directory : `public`
3. **Environment variables** (choisissez le type *Secret* / *Encrypt* pour les clés) :
   - `ANTHROPIC_API_KEY` : votre clé Claude
   - `OPENAI_API_KEY` : votre clé OpenAI
   - `APP_CODE` : le code d'accès que vous donnerez à vos testeurs
4. **Save and Deploy**. L'adresse de l'app s'affiche à la fin (du type `ia-hiwar.pages.dev`).

### Réglages facultatifs

| Variable | Par défaut | Rôle |
| --- | --- | --- |
| `CLAUDE_MODEL` | `claude-haiku-5-5` | Mettre `claude-sonnet-5-5` pour un professeur plus fin (plus cher) |
| `TRANSCRIBE_MODEL` | `gpt-4o-mini-transcribe` | Modèle qui écoute l'élève |
| `TTS_MODEL` | `gpt-4o-mini-tts` | Modèle qui parle |
| `TTS_VOICE` | `ash` | Voix du professeur (ex. `alloy`, `coral`, `onyx`) |

Après un changement de variable, relancez un déploiement (**Deployments → Retry deployment**).
