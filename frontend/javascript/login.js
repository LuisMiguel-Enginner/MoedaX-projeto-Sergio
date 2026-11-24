import { api, setToken, mapAuthError, showMessage, hideMessage, getToken } from './auth-api.js';

const form = document.querySelector('#loginForm');
const messageEl = document.querySelector('#authMessage');
const submitBtn = document.querySelector('#loginSubmit');
const rememberKey = 'moedax_remember_email';

function restoreRememberedEmail() {
  const saved = localStorage.getItem(rememberKey);
  const emailInput = document.querySelector('#email');
  const rememberCheckbox = document.querySelector('#remember');
  if (saved && emailInput) {
    emailInput.value = saved;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  hideMessage(messageEl);

  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const remember = document.querySelector('#remember')?.checked;

  if (!email || !password) {
    showMessage(messageEl, 'error', 'Preencha e-mail e senha.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Entrando...';

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    localStorage.removeItem('moedax_demo_mode');
    if (remember) localStorage.setItem(rememberKey, email);
    else localStorage.removeItem(rememberKey);
    window.location.href = 'index.html';
  } catch (err) {
    showMessage(messageEl, 'error', mapAuthError(err.message));
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Entrar';
  }
}

async function redirectIfLoggedIn() {
  if (!getToken()) return;
  try {
    await api('/api/auth/me');
    window.location.href = 'index.html';
  } catch {
    setToken(null);
  }
}

form?.addEventListener('submit', handleLogin);
document.querySelector('#googleLogin')?.addEventListener('click', () => {
  showMessage(messageEl, 'error', 'Login social desativado. Use e-mail e senha da API Cloudflare.');
});
document.querySelector('#forgotPassword')?.addEventListener('click', (event) => {
  event.preventDefault();
  showMessage(messageEl, 'error', 'Recuperação de senha via e-mail foi substituída. Peça ao admin para redefinir.');
});

restoreRememberedEmail();
window.lucide?.createIcons();
redirectIfLoggedIn();
