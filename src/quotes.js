const MAX_FILE = 5 * 1024 * 1024;
const MAX_BODY = MAX_FILE + 32768;
function reject(message, status = 400) {
  throw new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } });
}
export async function validateQuoteFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return null;
  if (file.size > MAX_FILE) reject('Dosya en fazla 5 MB olabilir.', 413);
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['stl', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) reject('Yalnızca STL, PNG, JPEG ve WebP kabul edilir.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = new TextDecoder().decode(bytes.slice(0, 128));
  let valid = false;
  if (ext === 'png') valid = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (ext === 'jpg' || ext === 'jpeg') valid = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (ext === 'webp') valid = ascii.startsWith('RIFF') && ascii.slice(8,12) === 'WEBP';
  if (ext === 'stl') {
    const binary = bytes.length >= 84 && new DataView(bytes.buffer).getUint32(80, true) > 0 && 84 + new DataView(bytes.buffer).getUint32(80, true) * 50 === bytes.length;
    const content = binary ? '' : new TextDecoder().decode(bytes);
    valid = binary || (/^\s*solid\b/i.test(content) && /facet\s+normal/i.test(content) && /vertex\s+[-+.\d]/i.test(content) && /endsolid\b/i.test(content));
  }
  if (!valid) reject('Dosya içeriği seçilen biçimle eşleşmiyor.');
  return { bytes, ext, name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || `model.${ext}` };
}
export async function submitQuote(request, env) {
  if (!env.QUOTE_FILES) reject('Dosyalı teklif servisi henüz yapılandırılmadı. WhatsApp üzerinden ulaşabilirsiniz.', 503);
  if (!request.headers.get('Content-Type')?.startsWith('multipart/form-data;')) reject('Form verisi bekleniyor.', 415);
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) reject('Dosya en fazla 5 MB olabilir.', 413);
  const reader = request.body?.getReader(); if (!reader) reject('Form boş.');
  let total = 0; const chunks = [];
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    total += value.length;
    if (total > MAX_BODY) { await reader.cancel(); reject('Dosya en fazla 5 MB olabilir.', 413); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  let form;
  try { form = await new Response(buffer, { headers: { 'Content-Type': request.headers.get('Content-Type') } }).formData(); }
  catch { reject('Form okunamadı.'); }
  const field = (key, max, required = true) => {
    const value = form.get(key);
    if (value === null && !required) return '';
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) reject('Form alanlarını kontrol edin.');
    return value.trim();
  };
  const name = field('name',120), email = field('email',254), phone = field('phone',24), detail = field('detail',2000);
  const quantity = Number(field('quantity',6));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9 ()-]{10,24}$/.test(phone) || detail.length < 10 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) reject('E-posta, telefon, adet veya açıklama geçersiz.');
  if (field('privacy',8) !== 'accepted') reject('KVKK aydınlatma metnini okuduğunuzu onaylayın.');
  if (field('website',200,false)) reject('Talep doğrulanamadı.');
  const file = await validateQuoteFile(form.get('file'));
  const id = crypto.randomUUID(); const key = file ? `quotes/${id}.${file.ext}` : null;
  if (file) await env.QUOTE_FILES.put(key, file.bytes, { httpMetadata: { contentType: 'application/octet-stream' } });
  try {
    await env.DB.prepare(`INSERT INTO quote_requests(id,name,email,phone,detail,quantity,file_key,file_name,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).bind(id,name,email,phone,detail,quantity,key,file?.name || null,new Date().toISOString()).run();
  } catch (error) { if (key) await env.QUOTE_FILES.delete(key); throw error; }
  return { ok: true, reference: id, message: 'Talebiniz kaydedildi. Değerlendirme sonrası sizinle iletişime geçeceğiz.' };
}
