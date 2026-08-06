'use strict';

const API_BASE = window.FILEMENTOR_API_BASE || "";

const form = document.getElementById("register-form");
const errorMsg = document.getElementById("error-msg");
const successMsg = document.getElementById("success-msg");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";
  successMsg.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  if (password !== password2) {
    errorMsg.textContent = "Şifreler eşleşmiyor.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Kaydediliyor...";

  try {
    const res = await fetch(`${API_BASE}/api/admin/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.ok) {
      successMsg.textContent = data.message || "Kayıt alındı. Onay bekleniyor.";
      form.reset();
      form.querySelectorAll("input, button").forEach((el) => { el.disabled = true; });
    } else {
      errorMsg.textContent = data.message || "Kayıt başarısız.";
    }
  } catch (err) {
    errorMsg.textContent = "Sunucuya bağlanılamadı.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Kayıt Ol";
  }
});
