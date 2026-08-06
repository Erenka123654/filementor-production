// admin-guard.js
// admin.html dosyasının <head> kısmına, DİĞER SCRIPT'LERDEN ÖNCE ekle:
//   <script src="admin-guard.js"></script>
//
// Bu script sayfa yüklenir yüklenmez oturumu kontrol eder.
// Giriş yapılmamışsa hiçbir yönetim içeriği görünmeden login.html'e yönlendirir.

const ADMIN_API_BASE = window.FILEMENTOR_API_BASE || "";

window.__ADMIN_READY = (async function checkAdminSession() {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/api/admin/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      window.location.replace("login.html");
      return null;
    }
    const data = await res.json();
    window.__ADMIN_USERNAME = data.username || "";
    window.__ADMIN_ROLE = data.role || "staff";
    return data;
  } catch (err) {
    window.location.replace("login.html");
    return null;
  }
})();

// Çıkış yapma fonksiyonu — admin.html'de bir "Çıkış Yap" butonuna
// onclick="adminLogout()" olarak bağlayabilirsin.
async function adminLogout() {
  await fetch(`${ADMIN_API_BASE}/api/admin/logout`, {
    method: "POST",
    credentials: "include",
  });
  window.location.replace("login.html");
}
