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

function validateCheckout(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Geçersiz ödeme isteği.";
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) return "Sepet geçersiz.";
  for (const item of body.items) {
    if (!item || typeof item !== "object" || !/^[a-zA-Z0-9-]+$/.test(String(item.id || ""))) return "Sepette geçersiz ürün var.";
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return "Ürün adedi geçersiz.";
  }
  const required = ["name", "surname", "email", "phone", "identityNumber", "address", "district", "city", "zipCode"];
  for (const field of required) {
    if (typeof body[field] !== "string" || body[field].trim().length < 2 || body[field].trim().length > 300) return "Teslimat bilgileri eksik veya geçersiz.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) return "E-posta adresi geçersiz.";
  if (!/^\d{11}$/.test(body.identityNumber)) return "T.C. kimlik numarası 11 haneli olmalıdır.";
  if (!/^\+?[0-9 ()-]{10,20}$/.test(body.phone)) return "Telefon numarası geçersiz.";
  if (!/^[0-9]{5}$/.test(body.zipCode)) return "Posta kodu 5 haneli olmalıdır.";
  return null;
}

function iyzicoBaseUrl(env) {
  return env.IYZICO_ENVIRONMENT === "production" ? "https://api.iyzipay.com" : "https://sandbox-api.iyzipay.com";
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, bytes(value));
  return [...new Uint8Array(result)].map(value => value.toString(16).padStart(2, "0")).join("");
}

async function iyzicoRequest(env, path, payload) {
  if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET_KEY) throw new Error("Payment provider is not configured");
  const body = JSON.stringify(payload);
  const randomKey = `${Date.now()}${crypto.randomUUID().replaceAll("-", "")}`;
  const signature = await hmacHex(env.IYZICO_SECRET_KEY, `${randomKey}${path}${body}`);
  const authorization = btoa(`apiKey:${env.IYZICO_API_KEY}&randomKey:${randomKey}&signature:${signature}`);
  const response = await fetch(`${iyzicoBaseUrl(env)}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `IYZWSv2 ${authorization}`,
      "Content-Type": "application/json",
      "x-iyzi-rnd": randomKey,
    },
    body,
  });
  const text = await response.text();
  if (text.length > 100000) throw new Error("Payment provider response too large");
  let result;
  try { result = JSON.parse(text); } catch { throw new Error("Invalid payment provider response"); }
  if (!response.ok) throw new Error("Payment provider request failed");
  return result;
}

function normalizedPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "";
}

async function validIyzicoResponseSignature(result, secret) {
  if (!result.signature || !secret) return false;
  const fields = ["paymentStatus", "paymentId", "currency", "basketId", "conversationId", "paidPrice", "price", "token"];
  const values = fields.map(field => field === "paidPrice" || field === "price" ? normalizedPrice(result[field]) : String(result[field] ?? ""));
  return safeEqual(result.signature, await hmacHex(secret, values.join(":")));
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

      if (path === "/api/checkout" && request.method === "POST") {
        const checkout = await readJsonBody(request);
        const validationError = validateCheckout(checkout);
        if (validationError) return jsonResponse(request, { error: validationError }, 400);

        const quantities = new Map();
        for (const item of checkout.items) {
          const id = String(item.id);
          quantities.set(id, (quantities.get(id) || 0) + item.quantity);
        }
        const ids = [...quantities.keys()];
        const placeholders = ids.map(() => "?").join(",");
        const productResult = await env.DB.prepare(`
          SELECT id, name, price, category, stock
          FROM products
          WHERE active = 1 AND status = 'active' AND id IN (${placeholders})
        `).bind(...ids).all();
        const products = productResult.results ?? [];
        if (products.length !== ids.length) return jsonResponse(request, { error: "Sepette satışta olmayan ürün var." }, 409);

        let amountCents = 0;
        const orderItems = [];
        for (const product of products) {
          const quantity = quantities.get(String(product.id));
          if (!quantity || Number(product.stock) < quantity) return jsonResponse(request, { error: `${product.name} için yeterli stok yok.` }, 409);
          const unitCents = Math.round(Number(product.price) * 100);
          if (!Number.isSafeInteger(unitCents) || unitCents <= 0) return jsonResponse(request, { error: "Ürün fiyatı geçersiz." }, 409);
          amountCents += unitCents * quantity;
          orderItems.push({ id: String(product.id), name: String(product.name), category: String(product.category), quantity, unitCents });
        }
        if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 1000000000) return jsonResponse(request, { error: "Sipariş tutarı geçersiz." }, 400);

        const orderId = crypto.randomUUID();
        const fullName = `${checkout.name.trim()} ${checkout.surname.trim()}`;
        const amount = (amountCents / 100).toFixed(2);
        const callbackUrl = "https://api.filementorstudio.net/api/payments/iyzico/callback";
        await env.DB.prepare(`
          INSERT INTO orders
            (id, amount_cents, customer_name, customer_email, customer_phone, shipping_address,
             shipping_city, shipping_district, shipping_zip_code, items_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          orderId, amountCents, fullName, checkout.email.trim(), checkout.phone.trim(), checkout.address.trim(),
          checkout.city.trim(), checkout.district.trim(), checkout.zipCode.trim(), JSON.stringify(orderItems)
        ).run();

        const providerPayload = {
          locale: "tr",
          conversationId: orderId,
          price: amount,
          paidPrice: amount,
          currency: "TRY",
          basketId: orderId,
          paymentGroup: "PRODUCT",
          callbackUrl,
          enabledInstallments: [1, 2, 3, 6, 9],
          buyer: {
            id: orderId,
            name: checkout.name.trim(),
            surname: checkout.surname.trim(),
            identityNumber: checkout.identityNumber,
            email: checkout.email.trim(),
            gsmNumber: checkout.phone.trim(),
            registrationAddress: checkout.address.trim(),
            city: checkout.city.trim(),
            country: "Turkey",
            zipCode: checkout.zipCode.trim(),
            ip: request.headers.get("CF-Connecting-IP") || "127.0.0.1",
          },
          shippingAddress: { address: checkout.address.trim(), zipCode: checkout.zipCode.trim(), contactName: fullName, city: checkout.city.trim(), country: "Turkey" },
          billingAddress: { address: checkout.address.trim(), zipCode: checkout.zipCode.trim(), contactName: fullName, city: checkout.city.trim(), country: "Turkey" },
          basketItems: orderItems.map(item => ({
            id: item.id,
            price: ((item.unitCents * item.quantity) / 100).toFixed(2),
            name: item.name.slice(0, 120),
            category1: item.category.slice(0, 60) || "Diğer",
            itemType: "PHYSICAL",
          })),
        };

        let initialized;
        try {
          initialized = await iyzicoRequest(env, "/payment/iyzipos/checkoutform/initialize/auth/ecom", providerPayload);
        } catch {
          await env.DB.prepare("UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderId).run();
          return jsonResponse(request, { error: "Ödeme sağlayıcısına bağlanılamadı." }, 502);
        }
        const initSignature = await hmacHex(env.IYZICO_SECRET_KEY, `${initialized.conversationId ?? ""}:${initialized.token ?? ""}`);
        const validInit = initialized.status === "success" && initialized.conversationId === orderId &&
          typeof initialized.token === "string" && initialized.token.length <= 200 &&
          typeof initialized.paymentPageUrl === "string" && /^https:\/\/(?:sandbox-)?cpp\.iyzipay\.com(?:\/|\?)/.test(initialized.paymentPageUrl) &&
          await safeEqual(initialized.signature, initSignature);
        if (!validInit) {
          await env.DB.prepare("UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderId).run();
          return jsonResponse(request, { error: "Ödeme oturumu doğrulanamadı." }, 502);
        }
        await env.DB.prepare("UPDATE orders SET iyzico_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(initialized.token, orderId).run();
        return jsonResponse(request, { paymentPageUrl: initialized.paymentPageUrl, orderId }, 201);
      }

      if (path === "/api/payments/iyzico/callback" && request.method === "POST") {
        const contentLength = Number(request.headers.get("Content-Length") || 0);
        if (contentLength > 10000) return jsonResponse(request, { error: "İstek çok büyük." }, 413);
        const rawBody = await request.text();
        if (rawBody.length > 10000) return jsonResponse(request, { error: "İstek çok büyük." }, 413);
        const token = new URLSearchParams(rawBody).get("token") || "";
        const frontendUrl = new URL("https://filementorstudio.net/");
        if (!token || token.length > 200) {
          frontendUrl.searchParams.set("payment", "failed");
          return Response.redirect(frontendUrl.toString(), 303);
        }
        const order = await env.DB.prepare("SELECT id, amount_cents, status FROM orders WHERE iyzico_token = ?").bind(token).first();
        if (!order) {
          frontendUrl.searchParams.set("payment", "failed");
          return Response.redirect(frontendUrl.toString(), 303);
        }
        const result = await iyzicoRequest(env, "/payment/iyzipos/checkoutform/auth/ecom/detail", {
          locale: "tr", conversationId: order.id, token,
        });
        const expectedCents = Number(order.amount_cents);
        const paidCents = Math.round(Number(result.paidPrice) * 100);
        const verified = result.status === "success" && result.paymentStatus === "SUCCESS" &&
          result.conversationId === order.id && result.basketId === order.id && result.token === token &&
          paidCents === expectedCents && await validIyzicoResponseSignature(result, env.IYZICO_SECRET_KEY);
        await env.DB.prepare(`
          UPDATE orders SET status = ?, iyzico_payment_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'pending'
        `).bind(verified ? "paid" : "failed", verified ? String(result.paymentId || "") : null, order.id).run();
        frontendUrl.searchParams.set("payment", verified ? "success" : "failed");
        frontendUrl.searchParams.set("order", order.id);
        return Response.redirect(frontendUrl.toString(), 303);
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

      if (path === "/api/admin/orders" && request.method === "GET") {
        if (!await isAuthorized(request, env)) return jsonResponse(request, { error: "Yetkisiz işlem." }, 401);
        const result = await env.DB.prepare(`
          SELECT id, status, amount_cents AS amountCents, currency, customer_name AS customerName,
            customer_email AS customerEmail, created_at AS createdAt
          FROM orders ORDER BY created_at DESC LIMIT 200
        `).all();
        return jsonResponse(request, { orders: result.results ?? [] });
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
