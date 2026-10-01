// Cloudflare Worker icin: tum yanitlara guvenlik basliklari ekler,
// cerezlere Secure; HttpOnly; SameSite=Lax ekler, CORS'u izin listesine baglar.

const IZINLI_ORIGINLER = [
  "https://filementorstudio.net",
  "https://www.filementorstudio.net",
  // diger site(ler)ini buraya ekle
];

const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self'; " +
  "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests";

export default {
  async fetch(request, env, ctx) {
    // Mevcut Worker/Pages mantigini burada cagir:
    const yanit = await (env.ASSETS ? env.ASSETS.fetch(request) : fetch(request));
    const h = new Headers(yanit.headers);
    const origin = request.headers.get("Origin");

    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("X-Frame-Options", "SAMEORIGIN");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    h.set("Content-Security-Policy", CSP);

    // CORS: '*' yerine izin listesi
    h.delete("Access-Control-Allow-Origin");
    if (origin && IZINLI_ORIGINLER.includes(origin)) {
      h.set("Access-Control-Allow-Origin", origin);
      h.append("Vary", "Origin");
    }

    // Cerez bayraklari
    const cerezler = h.getSetCookie ? h.getSetCookie() : [];
    if (cerezler.length) {
      h.delete("Set-Cookie");
      for (let c of cerezler) {
        if (!/;\s*secure/i.test(c)) c += "; Secure";
        if (!/;\s*httponly/i.test(c)) c += "; HttpOnly";
        if (!/;\s*samesite/i.test(c)) c += "; SameSite=Lax";
        h.append("Set-Cookie", c);
      }
    }

    return new Response(yanit.body, { status: yanit.status, statusText: yanit.statusText, headers: h });
  },
};
