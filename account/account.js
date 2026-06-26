(function () {
  "use strict";

  var API_BASE = "/api/account";
  var state = { email: "" };
  var elements = {
    authPanel: document.getElementById("auth-panel"),
    dashboard: document.getElementById("dashboard"),
    emailForm: document.getElementById("email-form"),
    codeForm: document.getElementById("code-form"),
    email: document.getElementById("email"),
    code: document.getElementById("code"),
    emailConfirmation: document.getElementById("email-confirmation"),
    message: document.getElementById("auth-message"),
    requestButton: document.getElementById("request-code-button"),
    verifyButton: document.getElementById("verify-code-button"),
    changeEmailButton: document.getElementById("change-email-button"),
    logoutButton: document.getElementById("logout-button"),
    userEmail: document.getElementById("user-email")
  };

  function request(path, options) {
    return fetch(API_BASE + path, Object.assign({ credentials: "include" }, options || {}));
  }

  function showMessage(text, isError) {
    elements.message.textContent = text;
    elements.message.classList.toggle("is-error", Boolean(isError));
    elements.message.hidden = false;
  }

  function clearMessage() {
    elements.message.textContent = "";
    elements.message.hidden = true;
    elements.message.classList.remove("is-error");
  }

  function setButtonLoading(button, isLoading, idleText, loadingText) {
    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : idleText;
  }

  function showLogin() {
    elements.dashboard.hidden = true;
    elements.authPanel.hidden = false;
    elements.emailForm.hidden = false;
    elements.codeForm.hidden = true;
    clearMessage();
    window.setTimeout(function () { elements.email.focus(); }, 0);
  }

  function showCodeForm(email) {
    state.email = email;
    elements.emailConfirmation.textContent = email;
    elements.emailForm.hidden = true;
    elements.codeForm.hidden = false;
    showMessage("Мы отправили код на email", false);
    window.setTimeout(function () { elements.code.focus(); }, 0);
  }

  function showDashboard(user) {
    elements.userEmail.textContent = user.email || "";
    elements.authPanel.hidden = true;
    elements.dashboard.hidden = false;
    clearMessage();
  }

  function showRequestError(status) {
    if (status === 429) {
      showMessage("Слишком много попыток. Попробуйте позже.", true);
      return;
    }
    showMessage("Не получилось выполнить запрос. Попробуйте ещё раз.", true);
  }

  async function loadCurrentUser() {
    try {
      var response = await request("/me");
      if (response.status === 401) {
        showLogin();
        return;
      }
      if (!response.ok) {
        showLogin();
        showRequestError(response.status);
        return;
      }
      showDashboard(await response.json());
    } catch (error) {
      showLogin();
      showRequestError();
    }
  }

  async function requestCode(event) {
    event.preventDefault();
    clearMessage();
    var email = elements.email.value.trim();
    if (!elements.email.checkValidity()) {
      elements.email.reportValidity();
      return;
    }

    setButtonLoading(elements.requestButton, true, "Получить код", "Отправляем...");
    try {
      var response = await request("/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      });
      if (!response.ok) {
        showRequestError(response.status);
        return;
      }
      var payload = await response.json();
      showCodeForm(payload.email || email);
    } catch (error) {
      showRequestError();
    } finally {
      setButtonLoading(elements.requestButton, false, "Получить код", "Отправляем...");
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    clearMessage();
    var code = elements.code.value.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      showMessage("Введите шестизначный код из письма.", true);
      elements.code.focus();
      return;
    }

    setButtonLoading(elements.verifyButton, true, "Войти", "Проверяем...");
    try {
      var response = await request("/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email, code: code })
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          showMessage("Код неверный или устарел.", true);
        } else {
          showRequestError(response.status);
        }
        return;
      }
      showDashboard(await response.json());
    } catch (error) {
      showRequestError();
    } finally {
      setButtonLoading(elements.verifyButton, false, "Войти", "Проверяем...");
    }
  }

  async function logout() {
    elements.logoutButton.disabled = true;
    elements.logoutButton.textContent = "Выходим...";
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      elements.logoutButton.disabled = false;
      elements.logoutButton.textContent = "Выйти";
      state.email = "";
      elements.code.value = "";
      showLogin();
    }
  }

  elements.emailForm.addEventListener("submit", requestCode);
  elements.codeForm.addEventListener("submit", verifyCode);
  elements.changeEmailButton.addEventListener("click", showLogin);
  elements.logoutButton.addEventListener("click", logout);
  elements.code.addEventListener("input", function () {
    elements.code.value = elements.code.value.replace(/\D/g, "").slice(0, 6);
  });

  loadCurrentUser();
}());
