'use strict';

(function () {
  const STORAGE_KEY = "fm_cookie_consent";
  if (localStorage.getItem(STORAGE_KEY)) return;

  const banner = document.createElement("div");
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Çerez onayı");
  banner.style.cssText = [
    "position:fixed", "left:0", "right:0", "bottom:0", "z-index:9999",
    "background:#15130f", "color:#e9e5d8", "padding:14px 18px",
    "display:flex", "flex-wrap:wrap", "gap:12px", "align-items:center",
    "justify-content:center", "font-family:sans-serif", "font-size:14px",
    "border-top:1px solid rgba(255,255,255,.12)",
  ].join(";");

  const text = document.createElement("span");
  text.textContent = "Bu site, deneyiminizi iyileştirmek için çerezler kullanır. ";

  const link = document.createElement("a");
  link.href = "cerez-politikasi.html";
  link.style.color = "#ff8a5c";
  link.textContent = "Detaylı bilgi";
  text.appendChild(link);

  const acceptButton = document.createElement("button");
  acceptButton.type = "button";
  acceptButton.textContent = "Anladım";
  acceptButton.style.cssText = "background:#ff4d1c;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-weight:700;";
  acceptButton.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    banner.remove();
  });

  banner.append(text, acceptButton);
  document.body.appendChild(banner);
})();
