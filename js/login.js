'use strict';

// Backend adresini kendi API URL'inle değiştir (örn: https://filementor-api.onrender.com)
const API_BASE = window.FILEMENTOR_API_BASE || "";

const form = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Kontrol ediliyor...";

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // cookie gönderilsin/alınsın diye şart
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.ok) {
      window.location.href = "admin.html";
    } else {
      errorMsg.textContent = data.message || "Giriş başarısız.";
    }
  } catch (err) {
    errorMsg.textContent = "Sunucuya bağlanılamadı.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Giriş Yap";
  }
});
