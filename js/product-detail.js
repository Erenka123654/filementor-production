'use strict';
(async () => {
  const root = document.getElementById('product-detail');
  const node = (tag,text) => { const el=document.createElement(tag);el.textContent=text;return el; };
  try {
    await fetchProducts({strict:true});
    const product = getProducts().find(p=>String(p.id)===new URLSearchParams(location.search).get('id'));
    if (!product) { root.replaceChildren(node('h1','Ürün şu anda satışta değil')); return; }
    document.title=product.name+' | Filementor Studio';
    root.replaceChildren(node('h1',product.name),node('p',product.desc || ''),node('p',new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(product.price)));
    const link=node('a','Mağazada ürüne git');link.href='/#urunler';root.append(link);
  } catch { root.replaceChildren(node('p','Ürün yüklenemedi. Mağazayı yenileyerek tekrar deneyin.')); }
})();
