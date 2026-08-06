'use strict';

(() => {
  const root = document.getElementById('ai-chat');
  const panel = document.getElementById('ai-chat-panel');
  const toggle = document.getElementById('ai-chat-toggle');
  const close = document.getElementById('ai-chat-close');
  const form = document.getElementById('ai-chat-form');
  const input = document.getElementById('ai-chat-input');
  const messagesEl = document.getElementById('ai-chat-messages');
  const suggestions = document.getElementById('ai-chat-suggestions');
  if (!root || !panel || !toggle || !close || !form || !input || !messagesEl) return;

  const history = [];
  let busy = false;

  function setOpen(open) {
    root.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    if (open) input.focus();
  }

  function addMessage(role, content, extraClass = '') {
    const element = document.createElement('div');
    element.className = `ai-message ai-message-${role} ${extraClass}`.trim();
    element.textContent = content;
    messagesEl.appendChild(element);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return element;
  }

  async function send(content) {
    const text = String(content || '').trim();
    if (!text || busy) return;
    busy = true;
    form.querySelector('button').disabled = true;
    input.value = '';
    suggestions?.remove();
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    const loading = addMessage('assistant', 'Yanıt hazırlanıyor…', 'ai-message-loading');

    try {
      const response = await fetch(`${window.FILEMENTOR_API_BASE || ''}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ messages: history.slice(-7) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Asistan şu anda yanıt veremiyor.');
      const answer = String(data.answer || '').trim();
      if (!answer) throw new Error('Asistan boş bir yanıt verdi.');
      loading.remove();
      addMessage('assistant', answer);
      history.push({ role: 'assistant', content: answer.slice(0, 600) });
    } catch (error) {
      loading.textContent = error instanceof Error ? error.message : 'Bir bağlantı hatası oluştu. Lütfen tekrar deneyin.';
    } finally {
      busy = false;
      form.querySelector('button').disabled = false;
      input.focus();
    }
  }

  toggle.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', event => { event.preventDefault(); send(input.value); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 90)}px`;
  });
  suggestions?.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button) send(button.textContent);
  });
})();
