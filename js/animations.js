'use strict';

/* ═══════════════════════════════════════════════════════════
   Filementor Studio — Animasyon Katmanı (js)
   - Mevcut JS dosyalarına dokunmaz; sadece DOM'u gözlemler.
   - CSP uyumlu: inline script/style yok, yalnızca CSSOM kullanır.
   - prefers-reduced-motion açıksa hiçbir şey yapmaz.
   ═══════════════════════════════════════════════════════════ */
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  root.classList.add('fm-anim');

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));

  /* ── 1. Scroll ile belirme ─────────────────────────────── */
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('fm-in');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;

  function reveal(element, delay, direction) {
    if (!element || element.classList.contains('fm-reveal')) return;
    element.classList.add('fm-reveal');
    if (direction) element.dataset.fm = direction;
    element.style.setProperty('--d', (delay || 0) + 'ms');
    if (revealObserver) revealObserver.observe(element); else element.classList.add('fm-in');
  }

  function revealStatic() {
    reveal($('.section-head'), 0);
    reveal($('.about-text'), 0, 'left');
    reveal($('.about-visual'), 120, 'right');
    $$('.about-list li').forEach((li, i) => reveal(li, 250 + i * 90));
    $$('.spec-row').forEach((row, i) => reveal(row, 300 + i * 110));
    reveal($('.contact-head'), 0);
    reveal($('.contact-form'), 140);
    reveal($('.footer-inner'), 0);
  }

  /* ── 2. Ürün kartları (JS ile dinamik oluşuyor) ────────── */
  function decorateCard(card, index) {
    if (!card || card.classList.contains('fm-reveal')) return;
    const isCard = card.classList.contains('product-card');
    reveal(card, (index % 8) * 70, isCard ? 'print' : undefined);
    if (!isCard) return;
    card.classList.add('fm-tilt');
    if (!$('.fm-glare', card)) {
      const glare = document.createElement('span');
      glare.className = 'fm-glare';
      glare.setAttribute('aria-hidden', 'true');
      card.append(glare);
    }
  }

  function watchGrid() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    const run = () => Array.from(grid.children).forEach(decorateCard);
    run();
    new MutationObserver(run).observe(grid, { childList: true });

    if (!canHover) return;
    grid.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const card = event.target.closest('.product-card');
      if (!card || !grid.contains(card)) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    grid.addEventListener('pointerout', event => {
      const card = event.target.closest && event.target.closest('.product-card');
      if (!card || card.contains(event.relatedTarget)) return;
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  /* ── 3. Hero: arka plan katmanları, ışık, 3D eğilme ────── */
  function setupHero() {
    const hero = $('.hero');
    if (!hero) return;

    const bg = document.createElement('div');
    bg.className = 'fm-hero-bg';
    bg.setAttribute('aria-hidden', 'true');
    ['fm-orb fm-orb-1', 'fm-orb fm-orb-2', 'fm-orb fm-orb-3', 'fm-spot', 'fm-scan'].forEach(name => {
      const node = document.createElement('div');
      node.className = name;
      bg.append(node);
    });
    hero.prepend(bg);

    if (!canHover) return;
    const spot = $('.fm-spot', bg);
    const frame = $('.print-frame', hero);
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      spot.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
      spot.style.setProperty('--my', (event.clientY - rect.top) + 'px');
      if (frame) {
        const f = frame.getBoundingClientRect();
        const x = (event.clientX - (f.left + f.width / 2)) / rect.width;
        const y = (event.clientY - (f.top + f.height / 2)) / rect.height;
        frame.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
        frame.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
      }
    });
    hero.addEventListener('pointerleave', () => {
      if (!frame) return;
      frame.style.setProperty('--rx', '0deg');
      frame.style.setProperty('--ry', '0deg');
    });
  }

  /* ── 4. Rakam sayacı (150+, 500+, 2 GÜN) ───────────────── */
  function countUp(element) {
    const match = element.textContent.trim().match(/^(\d+)(.*)$/);
    if (!match) return;
    const end = Number(match[1]);
    const suffix = match[2];
    const duration = 1500;
    let start = null;
    element.textContent = '0' + suffix;
    function step(timestamp) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(end * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setupCounters() {
    const numbers = $$('.stat-n');
    if (!numbers.length) return;
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        setTimeout(() => countUp(entry.target), 900); // hero girişi bitsin
      });
    }, { threshold: 0.6 });
    numbers.forEach(number => observer.observe(number));
  }

  /* ── 5. Navbar + scroll ilerleme çubuğu ────────────────── */
  function setupScroll() {
    const nav = $('.navbar');
    const bar = document.createElement('div');
    bar.className = 'fm-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.append(bar);

    const stickyNav = nav && ['fixed', 'sticky'].includes(getComputedStyle(nav).position);
    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0).toFixed(4) + ')';
      if (nav) {
        nav.classList.toggle('fm-scrolled', y > 30);
        const focusInside = nav.contains(document.activeElement);
        if (stickyNav && y > lastY + 4 && y > 260 && !focusInside) nav.classList.add('fm-hide');
        else if (y < lastY - 4 || y < 260) nav.classList.remove('fm-hide');
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ── 6. Buton dalga efekti + manyetik butonlar ─────────── */
  function setupButtons() {
    document.addEventListener('pointerdown', event => {
      const button = event.target.closest && event.target.closest('.btn, .cart-btn, .filter-chip');
      if (!button || button.disabled) return;
      if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
      button.style.overflow = 'hidden';
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple = document.createElement('span');
      ripple.className = 'fm-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
      button.append(ripple);
      setTimeout(() => ripple.remove(), 700);
    });

    if (!canHover) return;
    $$('.hero-actions .btn').forEach(button => {
      button.classList.add('fm-magnet');
      button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        button.style.translate = (dx * 0.18).toFixed(1) + 'px ' + (dy * 0.28).toFixed(1) + 'px';
      });
      button.addEventListener('pointerleave', () => { button.style.translate = ''; });
    });
  }

  /* ── 7. Sepet rozeti animasyonu ────────────────────────── */
  function setupCartFeedback() {
    const count = document.getElementById('cart-count');
    const button = document.getElementById('cart-btn');
    if (!count) return;
    let previous = count.textContent;
    new MutationObserver(() => {
      if (count.textContent === previous) return;
      const increased = Number(count.textContent) > Number(previous);
      previous = count.textContent;
      count.classList.remove('fm-bump');
      void count.offsetWidth; // animasyonu yeniden başlat
      count.classList.add('fm-bump');
      if (increased && button) {
        button.classList.remove('fm-wiggle');
        void button.offsetWidth;
        button.classList.add('fm-wiggle');
      }
    }).observe(count, { childList: true, characterData: true, subtree: true });
  }

  /* ── Başlat ────────────────────────────────────────────── */
  function init() {
    setupHero();
    revealStatic();
    watchGrid();
    setupCounters();
    setupScroll();
    setupButtons();
    setupCartFeedback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
