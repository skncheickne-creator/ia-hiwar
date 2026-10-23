// Protection simple : chaque appel doit envoyer le code d'accès (variable APP_CODE dans Cloudflare).
// Sans ce code, personne ne peut utiliser vos crédits API.

export function checkCode(request, env) {
  if (!env.APP_CODE) return json({ error: "Le code d'accès (APP_CODE) n'est pas configuré dans Cloudflare." }, 500);
  const sent = request.headers.get("x-hiwar-code") || "";
  if (sent !== env.APP_CODE) return json({ error: "Code d'accès incorrect." }, 401);
  return null;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
