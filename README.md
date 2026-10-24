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

## Mise en ligne sur Cloudflare (Workers)

Le projet est un Worker Cloudflare (`wrangler.jsonc`) relié à ce dépôt : chaque modification sur GitHub le remet en ligne automatiquement.

1. **Workers & Pages** → `ia-hiwar` → **Paramètres** → **Variables et secrets** → ajoutez, en type **Secret** :
   - `ANTHROPIC_API_KEY` : votre clé Claude
   - `OPENAI_API_KEY` : votre clé OpenAI
   - `APP_CODE` : le code d'accès donné aux testeurs
2. **Paramètres** → **Domaines et routes** : activez l'adresse **workers.dev**.
3. L'adresse de l'app est du type `ia-hiwar.<votre-compte>.workers.dev`.

### Réglages facultatifs

| Variable | Par défaut | Rôle |
| --- | --- | --- |
| `CLAUDE_MODEL` | `claude-haiku-5-5` | Mettre `claude-sonnet-5-5` pour un professeur plus fin (plus cher) |
| `TRANSCRIBE_MODEL` | `gpt-4o-mini-transcribe` | Modèle qui écoute l'élève |
| `TTS_MODEL` | `gpt-4o-mini-tts` | Modèle qui parle |
| `TTS_VOICE` | `cedar` | Voix par défaut (l’élève choisit sa voix dans l’app, bouton « Voix ») |

Ces réglages facultatifs s'ajoutent au même endroit que les clés.
