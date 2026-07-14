const ALLOWED_ORIGINS = new Set([
  "https://filementorstudio.net",
  "https://www.filementorstudio.net",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");

  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      ...getCorsHeaders(request),
    },
  });
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

function sessionCookie(request, value, maxAge) {
  const host = new URL(request.url).hostname;
  const secure = host !== "localhost" && host !== "127.0.0.1";
  return `admin_session=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Strict`;
}

function bytes(value) {
  return new TextEncoder().encode(value);
}

async function safeEqual(left, right) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", bytes(String(left || ""))),
    crypto.subtle.digest("SHA-256", bytes(String(right || ""))),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

async function sessionSignature(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, bytes(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function createSession(env) {
  const payload = `${Date.now() + 60 * 60 * 1000}.${crypto.randomUUID()}`;
  return `${payload}.${await sessionSignature(payload, env.SESSION_SECRET)}`;
}

async function hasValidSession(request, env) {
  const secret = env.SESSION_SECRET;
  if (!secret) return false;
  const token = getCookie(request, "admin_session");
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(payload.split(".", 1)[0]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  return safeEqual(signature, await sessionSignature(payload, secret));
}

async function isAuthorized(request, env) {
  return hasValidSession(request, env);
}

function validateProduct(product) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    return "Geçersiz ürün verisi.";
  }

  const name = String(product.name ?? "").trim();
  const description = String(product.description ?? product.desc ?? "").trim();
  const imageUrl = String(
    product.imageUrl ?? product.image_url ?? product.image ?? ""
  ).trim();

  const price = Number(product.price);
  const stock = Number(product.stock ?? 0);

  if (name.length < 2 || name.length > 120) {
    return "Ürün adı 2 ile 120 karakter arasında olmalıdır.";
  }

  if (description.length > 2000) {
    return "Ürün açıklaması en fazla 2000 karakter olabilir.";
  }

  if (!Number.isFinite(price) || price < 0 || price > 10000000) {
    return "Geçersiz ürün fiyatı.";
  }

  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
    return "Geçersiz stok miktarı.";
  }

  const category = String(product.category ?? product.cat ?? "").trim();
  if (category.length < 1 || category.length > 60) return "Geçersiz ürün kategorisi.";
  if (product.status !== undefined && !["active", "out", "draft"].includes(product.status)) {
    return "Geçersiz ürün durumu.";
  }
  if (product.isNew !== undefined && typeof product.isNew !== "boolean") {
    return "Geçersiz yeni ürün değeri.";
  }
  if (String(product.emoji ?? "").length > 8) return "Geçersiz ürün simgesi.";

  if (imageUrl.length > 700000) {
    return "Görsel adresi çok uzun.";
  }

  if (
    imageUrl &&
    !imageUrl.startsWith("https://") &&
    !imageUrl.startsWith("/") &&
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageUrl)
  ) {
    return "Görsel adresi HTTPS olmalıdır.";
  }

  return null;
}

async function readJsonBody(request) {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Response(
      JSON.stringify({ error: "JSON içerik gereklidir." }),
      {
        status: 415,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > 800000) {
    throw new Response(JSON.stringify({ error: "İstek gövdesi çok büyük." }), {
      status: 413,
      headers: { "Content-Type": "application/json; charset=UTF-8" },
    });
  }

  const bodyText = await request.text();

  if (bodyText.length > 800000) {
    throw new Response(
      JSON.stringify({ error: "İstek gövdesi çok büyük." }),
      {
        status: 413,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Response(
      JSON.stringify({ error: "Geçersiz JSON." }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );
  }
}

async function enforceRateLimit(request, env, path) {
  const login = path === "/api/admin/login";
  const windowSeconds = login ? 900 : 60;
  const limit = login ? 5 : 60;
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `${ip}:${path}:${windowId}`;
  await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at < ?")
    .bind(Math.floor(Date.now() / 1000))
    .run();
  const result = await env.DB.prepare(`
    INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1
    RETURNING count
  `).bind(key, (windowId + 1) * windowSeconds).first();
  return Number(result?.count || 0) <= limit;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");

      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return jsonResponse(
          request,
          { error: "Origin izinli değil." },
          403
        );
      }

      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request),
      });
    }

    try {
      if (!await enforceRateLimit(request, env, path)) {
        return jsonResponse(request, { error: "Çok fazla istek. Daha sonra tekrar deneyin." }, 429);
      }

      if (
        path.startsWith("/api/admin/") &&
        ["POST", "PUT", "DELETE"].includes(request.method) &&
        !ALLOWED_ORIGINS.has(request.headers.get("Origin"))
      ) {
        return jsonResponse(request, { error: "İstek kaynağı reddedildi." }, 403);
      }

      if (path === "/api/admin/login" && request.method === "POST") {
        const credentials = await readJsonBody(request);
        const configured = Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET);
        const expectedUsername = env.ADMIN_USERNAME || "admin";
        const validShape = credentials && typeof credentials === "object" &&
          !Array.isArray(credentials) &&
          typeof credentials.username === "string" &&
          typeof credentials.password === "string" &&
          credentials.username.length <= 100 && credentials.password.length <= 200;
        const usernameOk = validShape && configured &&
          await safeEqual(credentials.username.trim(), expectedUsername);
        const passwordOk = validShape && configured &&
          await safeEqual(credentials.password, env.ADMIN_PASSWORD);
        if (!usernameOk || !passwordOk) {
          return jsonResponse(request, { ok: false, message: "Kullanıcı adı veya şifre hatalı." }, 401);
        }
        const response = jsonResponse(request, { ok: true });
        response.headers.append(
          "Set-Cookie",
          sessionCookie(request, await createSession(env), 3600)
        );
        return response;
      }

      if (path === "/api/admin/me" && request.method === "GET") {
        return await isAuthorized(request, env)
          ? jsonResponse(request, { ok: true, username: env.ADMIN_USERNAME || "admin" })
          : jsonResponse(request, { ok: false }, 401);
      }

      if (path === "/api/admin/logout" && request.method === "POST") {
        if (!await isAuthorized(request, env)) {
          return jsonResponse(request, { error: "Yetkisiz işlem." }, 401);
        }
        const response = jsonResponse(request, { ok: true });
        response.headers.append(
          "Set-Cookie",
          sessionCookie(request, "", 0)
        );
        return response;
      }

      if (path === "/api/health" && request.method === "GET") {
        return jsonResponse(request, {
          ok: true,
          service: "filementor-api",
        });
      }

      if (path === "/api/products" && request.method === "GET") {
        const result = await env.DB.prepare(`
          SELECT
            id,
            name,
            description,
            price,
            image_url AS imageUrl,
            image_url AS image,
            category AS cat,
            description AS desc,
            stock,
            active,
            status,
            is_new AS isNew,
            emoji
          FROM products
          WHERE active = 1
          ORDER BY created_at DESC
        `).all();

        return jsonResponse(request, {
          products: result.results ?? [],
        });
      }

      if (path === "/api/admin/products" && request.method === "POST") {
        if (!await isAuthorized(request, env)) {
          return jsonResponse(
            request,
            { error: "Yetkisiz işlem." },
            401
          );
        }

        const product = await readJsonBody(request);
        const validationError = validateProduct(product);

        if (validationError) {
          return jsonResponse(
            request,
            { error: validationError },
            400
          );
        }

        const id = crypto.randomUUID();
        const name = String(product.name).trim();
        const description = String(product.description ?? product.desc ?? "").trim();
        const price = Number(product.price);
        const imageUrl = String(
          product.imageUrl ?? product.image_url ?? product.image ?? ""
        ).trim();
        const stock = Number(product.stock ?? 0);
        const category = String(product.category ?? product.cat ?? "").trim();
        const status = ["active", "out", "draft"].includes(product.status) ? product.status : "active";
        const isNew = product.isNew === true ? 1 : 0;
        const emoji = String(product.emoji ?? "").slice(0, 8);

        await env.DB.prepare(`
          INSERT INTO products
            (id, name, description, price, image_url, stock, active, category, status, is_new, emoji)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            id,
            name,
            description,
            price,
            imageUrl,
            stock,
            status === "active" ? 1 : 0,
            category,
            status,
            isNew,
            emoji
          )
          .run();

        return jsonResponse(
          request,
          {
            success: true,
            product: {
              id,
              name,
              description,
              price,
              imageUrl,
              stock,
              active: status === "active" ? 1 : 0,
              cat: category,
              desc: description,
              image: imageUrl,
              status,
              isNew: Boolean(isNew),
              emoji,
            },
          },
          201
        );
      }

      const productMatch = path.match(
        /^\/api\/admin\/products\/([a-zA-Z0-9-]+)$/
      );

      if (productMatch && request.method === "PUT") {
        if (!await isAuthorized(request, env)) {
          return jsonResponse(request, { error: "Yetkisiz işlem." }, 401);
        }
        const product = await readJsonBody(request);
        const validationError = validateProduct(product);
        if (validationError) return jsonResponse(request, { error: validationError }, 400);

        const description = String(product.description ?? product.desc ?? "").trim();
        const imageUrl = String(product.imageUrl ?? product.image_url ?? product.image ?? "").trim();
        const status = ["active", "out", "draft"].includes(product.status) ? product.status : "active";
        const result = await env.DB.prepare(`
          UPDATE products SET
            name = ?, description = ?, price = ?, image_url = ?, stock = ?,
            active = ?, category = ?, status = ?, is_new = ?, emoji = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          String(product.name).trim(), description, Number(product.price), imageUrl,
          Number(product.stock ?? 0), status === "active" ? 1 : 0,
          String(product.category ?? product.cat ?? "").trim(), status,
          product.isNew === true ? 1 : 0, String(product.emoji ?? "").slice(0, 8),
          productMatch[1]
        ).run();
        if (!result.meta?.changes) return jsonResponse(request, { error: "Ürün bulunamadı." }, 404);
        return jsonResponse(request, { success: true });
      }

      if (path === "/api/admin/products" && request.method === "GET") {
        if (!await isAuthorized(request, env)) {
          return jsonResponse(request, { error: "Yetkisiz işlem." }, 401);
        }
        const result = await env.DB.prepare(`
          SELECT id, name, description, price, image_url AS imageUrl,
            image_url AS image, category AS cat, description AS desc, stock,
            active, status, is_new AS isNew, emoji
          FROM products ORDER BY created_at DESC
        `).all();
        return jsonResponse(request, { products: result.results ?? [] });
      }

      if (productMatch && request.method === "DELETE") {
        if (!await isAuthorized(request, env)) {
          return jsonResponse(
            request,
            { error: "Yetkisiz işlem." },
            401
          );
        }

        const id = productMatch[1];

        const result = await env.DB.prepare(`
          DELETE FROM products
          WHERE id = ?
        `)
          .bind(id)
          .run();

        if (!result.meta?.changes) {
          return jsonResponse(
            request,
            { error: "Ürün bulunamadı." },
            404
          );
        }

        return jsonResponse(request, {
          success: true,
        });
      }

      return jsonResponse(
        request,
        { error: "Endpoint bulunamadı." },
        404
      );
    } catch (error) {
      if (error instanceof Response) {
        const headers = new Headers(error.headers);

        Object.entries(getCorsHeaders(request)).forEach(
          ([key, value]) => headers.set(key, value)
        );

        headers.set("Cache-Control", "no-store");
        headers.set("X-Content-Type-Options", "nosniff");

        return new Response(error.body, {
          status: error.status,
          headers,
        });
      }

      console.error(JSON.stringify({
        level: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        path,
        method: request.method,
      }));

      return jsonResponse(
        request,
        { error: "Sunucu işlemi tamamlayamadı." },
        500
      );
    }
  },
};
