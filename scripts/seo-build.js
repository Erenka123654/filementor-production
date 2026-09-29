'use strict';
const fs=require('node:fs'); const path=require('node:path');
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function buildSeo(root, output) {
  const snapshotPath=path.join(root,'data/catalog-export.json');
  if(!fs.existsSync(snapshotPath)) throw new Error('Önce npm run catalog:sync çalıştırın. Örnek ürünler SEO sayfasına dönüştürülmez.');
  const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
  if(!Array.isArray(snapshot.products)) throw new Error('Geçersiz katalog.');
  const origin='https://filementorstudio.net'; const urls=[origin+'/'];const ids=[];const items=[];
  fs.mkdirSync(path.join(output,'urunler'),{recursive:true});
  for(const product of snapshot.products) {
    if(!/^[a-zA-Z0-9-]+$/.test(String(product.id)) || !product.name || !Number.isFinite(Number(product.price)) || Number(product.price)<0) throw new Error('Katalogda geçersiz ürün var.');
    if(product.status==='draft' || product.active===0) continue;
    const id=String(product.id);ids.push(id);const url=`${origin}/urunler/${id}.html`;urls.push(url);
    const name=escape(product.name),description=escape(product.desc || product.description || `${product.name} — Filementor Studio 3D baskı ürünü.`);
    const image=product.image || product.imageUrl || '';
    const safeImage=/^https:\/\//.test(image) || /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(image);
    const available=Number(product.stock)>0 && product.status==='active';
    const schema={'@context':'https://schema.org','@type':'Product',name:product.name,description:product.desc || product.description || product.name,sku:id,brand:{'@type':'Brand',name:'Filementor Studio'},offers:{'@type':'Offer',url,priceCurrency:'TRY',price:Number(product.price).toFixed(2),availability:`https://schema.org/${available?'InStock':'OutOfStock'}`,itemCondition:'https://schema.org/NewCondition'}};
    if(/^https:\/\//.test(image)) schema.image=[image];
    const json=JSON.stringify(schema).replaceAll('<','\\u003c');
    fs.writeFileSync(path.join(output,'urunler',`${id}.html`),`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} | Filementor Studio</title><meta name="description" content="${description.slice(0,500)}"><link rel="canonical" href="${url}"><meta property="og:title" content="${name}"><meta property="og:url" content="${url}"><link rel="stylesheet" href="/css/quotes.css"><script type="application/ld+json">${json}</script></head><body><main><a href="/">← Mağaza</a><article><h1>${name}</h1>${safeImage?`<img src="${escape(image)}" alt="${name}" width="280" loading="lazy">`:''}<p>${description}</p><p>${escape(product.cat || product.category || '')}</p><p>${escape(Number(product.price).toFixed(2))} TL</p><p>${available?'Stokta':'Stokta yok'}</p><p>Katalog güncellemesi: ${escape(snapshot.fetchedAt)}. Güncel stok ve fiyat mağazada doğrulanır.</p><a href="/urun.html?id=${id}">Güncel ürün bilgisini gör</a><p><a href="https://wa.me/905013242362?text=${encodeURIComponent(product.name+' hakkında bilgi almak istiyorum.')}" rel="noopener noreferrer">Bu ürün hakkında WhatsApp’tan sor</a></p></article><p>Malzeme, ölçü, üretim ve teslimat süresini siparişten önce doğrulayın.</p></main></body></html>`);
    if(/^https:\/\//.test(image)) items.push(`<item><g:id>${escape(id)}</g:id><g:title>${name}</g:title><g:description>${description}</g:description><g:link>${url}</g:link><g:image_link>${escape(image)}</g:image_link><g:availability>${available?'in_stock':'out_of_stock'}</g:availability><g:price>${Number(product.price).toFixed(2)} TRY</g:price><g:condition>new</g:condition><g:brand>Filementor Studio</g:brand></item>`);
  }
  fs.writeFileSync(path.join(output,'js/catalog-pages.js'),`window.FILEMENTOR_SEO_IDS = ${JSON.stringify(ids)};\n`);
  fs.writeFileSync(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`);
  fs.writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /teklifler.html\nDisallow: /login.html\nSitemap: '+origin+'/sitemap.xml\n');
  // Draft feed needs product identifier/shipping policy review before Merchant Center submission.
  fs.writeFileSync(path.join(output,'merchant-feed.xml'),`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Filementor Studio</title><link>${origin}</link><description>Ürün kataloğu</description>${items.join('')}</channel></rss>`);
  console.log(`SEO: ${ids.length} statik ürün sayfası, ${items.length} HTTPS görselli feed ürünü.`);
}
module.exports={buildSeo};
