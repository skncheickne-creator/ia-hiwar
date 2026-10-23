// Point d'entrée Cloudflare Workers : envoie /api/... vers le bon service, et sert la page pour le reste.
import * as chat from "../functions/api/chat.js";
import * as transcribe from "../functions/api/transcribe.js";
import * as speak from "../functions/api/speak.js";
import * as texts from "../functions/api/texts.js";
import { json } from "../lib/auth.js";

const ROUTES = {
  "POST /api/chat": chat.onRequestPost,
  "POST /api/transcribe": transcribe.onRequestPost,
  "POST /api/speak": speak.onRequestPost,
  "GET /api/texts": texts.onRequestGet,
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) {
      const handler = ROUTES[`${request.method} ${pathname}`];
      if (!handler) return json({ error: "Adresse inconnue." }, 404);
      try {
        return await handler({ request, env });
      } catch (err) {
        console.log("Erreur serveur", err && err.stack);
        return json({ error: "Erreur du serveur. Réessayez." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
