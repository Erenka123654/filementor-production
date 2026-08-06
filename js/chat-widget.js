'use strict';

/* Filementor RAG chat widget.
   - innerHTML kullanmaz (security-check.js kuralına uyar).
   - js/api-config.js'in tanımladığı window.FILEMENTOR_API_BASE'i kullanır. */

(function () {
  const STORAGE_KEY = 'filementor_chat_open';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function buildWidget() {
    const root = el('div', 'fm-chat-root');

    const toggle = el('button', 'fm-chat-toggle', '💬 Yardım');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Sohbet asistanını aç');

    const panel = el('div', 'fm-chat-panel');
    panel.hidden = true;

    const header = el('div', 'fm-chat-header');
    header.appendChild(el('span', null, 'Filementor Asistan'));
    const closeBtn = el('button', 'fm-chat-close', '✕');
    closeBtn.type = 'button';
    header.appendChild(closeBtn);

    const messages = el('div', 'fm-chat-messages');
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');

    const form = el('form', 'fm-chat-form');
    const input = el('input', 'fm-chat-input');
    input.type = 'text';
    input.maxLength = 500;
    input.placeholder = 'Bir soru sorun… (kargo, iade, filament türleri)';
    input.setAttribute('aria-label', 'Mesajınız');
    const sendBtn = el('button', 'fm-chat-send', 'Gönder');
    sendBtn.type = 'submit';
    form.appendChild(input);
    form.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(form);

    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    function addMessage(text, role) {
      const bubble = el('div', `fm-chat-bubble fm-chat-${role}`, text);
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    function setOpen(open) {
      panel.hidden = !open;
      try { sessionStorage.setItem(STORAGE_KEY, open ? '1' : '0'); } catch (_) {}
      if (open) input.focus();
    }

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    closeBtn.addEventListener('click', () => setOpen(false));

    let greeted = false;
    toggle.addEventListener('click', () => {
      if (!greeted) {
        addMessage('Merhaba! Kargo, iade veya ürünlerimiz hakkında soru sorabilirsiniz.', 'bot');
        greeted = true;
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (question.length < 2) return;

      addMessage(question, 'user');
      input.value = '';
      sendBtn.disabled = true;
      const thinking = el('div', 'fm-chat-bubble fm-chat-bot fm-chat-thinking', 'Yazıyor…');
      messages.appendChild(thinking);
      messages.scrollTop = messages.scrollHeight;

      try {
        const response = await fetch(`${window.FILEMENTOR_API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: question }),
        });
        const data = await response.json();
        thinking.remove();
        if (!response.ok || !data.answer) {
          addMessage('Şu anda yanıt üretemiyorum, lütfen daha sonra tekrar deneyin.', 'bot');
        } else {
          addMessage(data.answer, 'bot');
        }
      } catch (err) {
        thinking.remove();
        addMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyin.', 'bot');
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
