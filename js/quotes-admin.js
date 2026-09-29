'use strict';
(() => {
  const base = window.FILEMENTOR_API_BASE || '';
  const status = document.getElementById('quote-status');
  const node = (tag,text) => { const el = document.createElement(tag); el.textContent = text; return el; };
  async function request(path,options = {}) {
    const response = await fetch(base + path, { credentials:'include', cache:'no-store', ...options });
    if (!response.ok) throw new Error(response.status === 401 ? 'Oturum sona erdi. Yeniden giriş yapın.' : 'İşlem tamamlanamadı.');
    return response;
  }
  async function load() {
    const refresh = document.getElementById('refreshQuotes'); refresh.disabled = true; status.textContent = 'Yükleniyor…';
    try {
      const { quotes } = await (await request('/api/admin/quotes')).json();
      const list = document.getElementById('quote-list'); list.replaceChildren();
      for (const quote of quotes) {
        const article = document.createElement('article');
        article.append(node('h2',quote.name),node('small',`${quote.created_at} · ${quote.id}`),node('p',`${quote.email} · ${quote.phone}\nAdet: ${quote.quantity}\n${quote.detail}`));
        const select = document.createElement('select'); select.setAttribute('aria-label','Talep durumu');
        for (const [value,label] of [['new','Yeni'],['reviewing','İnceleniyor'],['completed','Tamamlandı']]) { const option = node('option',label); option.value=value; select.append(option); }
        select.value=quote.status;
        select.addEventListener('change',async () => { select.disabled=true; try { await request(`/api/admin/quotes/${quote.id}`,{ method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:select.value}) }); status.textContent='Durum kaydedildi.'; quote.status=select.value; } catch(e) { select.value=quote.status; status.textContent=e.message; } finally { select.disabled=false; } }); article.append(select);
        if (quote.file_name) {
          const download=node('button',`Dosyayı indir: ${quote.file_name}`);
          download.addEventListener('click',async () => { download.disabled=true; try { const file=await (await request(`/api/admin/quotes/${quote.id}/file`)).blob(); const url=URL.createObjectURL(file); const link=document.createElement('a'); link.href=url;link.download=quote.file_name;link.click(); setTimeout(()=>URL.revokeObjectURL(url),60000); } catch(e) { status.textContent=e.message; } finally { download.disabled=false; } }); article.append(download);
        }
        list.append(article);
      }
      status.textContent=quotes.length ? `${quotes.length} talep listelendi.` : 'Henüz talep yok.';
    } catch(e) { status.textContent=e.message; } finally { refresh.disabled=false; }
  }
  document.getElementById('refreshQuotes').addEventListener('click',load);
  window.__ADMIN_READY.then(session=>{ if(session) load(); });
})();
