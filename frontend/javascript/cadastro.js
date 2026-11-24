import { api, setToken, mapAuthError, showMessage, hideMessage, getToken } from './auth-api.js';

const form = document.querySelector('#registerForm');
const messageEl = document.querySelector('#authMessage');
const submitBtn = document.querySelector('#registerSubmit');

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    const input = document.querySelector(button.getAttribute('data-toggle-password'));
    if (!input) return;
    button.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
      button.innerHTML = isHidden
        ? '<i data-lucide="eye-off"></i>'
        : '<i data-lucide="eye"></i>';
      window.lucide?.createIcons({ nodes: [button] });
    });
  });
}

function getAccountType() {
  const selected = form.querySelector('input[name="account_type"]:checked');
  return selected?.value || 'investidor';
}

function getPasswordRequirements(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
}

function updatePasswordRequirements(password) {
  const requirements = getPasswordRequirements(password);
  Object.entries(requirements).forEach(([name, valid]) => {
    document.querySelector(`[data-requirement="${name}"]`)?.classList.toggle('valid', valid);
  });
  return Object.values(requirements).every(Boolean);
}

async function handleRegister(event) {
  event.preventDefault();
  hideMessage(messageEl);

  const fullName = document.querySelector('#fullName').value.trim();
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const confirmPassword = document.querySelector('#confirmPassword')?.value || '';
  const accountType = getAccountType();

  if (!fullName || !email || !password) {
    showMessage(messageEl, 'error', 'Preencha todos os campos obrigatórios.');
    return;
  }
  if (password !== confirmPassword) {
    showMessage(messageEl, 'error', 'As senhas não coincidem.');
    return;
  }
  if (!updatePasswordRequirements(password)) {
    showMessage(messageEl, 'error', 'A senha não atende aos requisitos mínimos.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Cadastrando...';

  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role: accountType === 'administrador' ? 'administrador' : 'investidor'
      })
    });
    setToken(null);
    showMessage(messageEl, 'success', 'Cadastro realizado com sucesso! Redirecionando para o login...');
    form.reset();
    document.querySelectorAll('[data-requirement]').forEach((item) => item.classList.remove('valid'));
    window.setTimeout(() => window.location.replace('login.html'), 1600);
  } catch (err) {
    showMessage(messageEl, 'error', mapAuthError(err.message));
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Cadastrar';
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

form?.addEventListener('submit', handleRegister);
document.querySelector('#password')?.addEventListener('input', (event) => updatePasswordRequirements(event.target.value));
initPasswordToggles();
window.lucide?.createIcons();
redirectIfLoggedIn();
