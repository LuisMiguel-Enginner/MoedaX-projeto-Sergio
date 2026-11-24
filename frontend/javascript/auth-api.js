const TOKEN_KEY = 'moedax_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Erro na requisição');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function mapAuthError(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('e-mail já cadastrado') || text.includes('already')) {
    return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
  }
  if (text.includes('e-mail ou senha') || text.includes('credenciais') || text.includes('inválid')) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  if (text.includes('failed to fetch') || text.includes('networkerror')) {
    return 'Não foi possível conectar à API. Verifique se o deploy Cloudflare está ativo.';
  }
  if (text.includes('password') && text.includes('6')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  return message || 'Ocorreu um erro. Tente novamente.';
}

export function showMessage(element, type, text) {
  if (!element) return;
  element.hidden = false;
  element.className = `auth-message ${type}`;
  element.textContent = text;
}

export function hideMessage(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
}
