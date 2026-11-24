import { api, getToken, setToken } from './auth-api.js';

const LOGIN_PATH = 'login.html';

export async function requireAuth() {
  // Sem token: vai direto para login (não abre dashboard)
  if (!getToken()) {
    window.location.replace(LOGIN_PATH);
    return new Promise(() => {});
  }

  try {
    const data = await api('/api/auth/me');
    if (!data?.user) {
      setToken(null);
      window.location.replace(LOGIN_PATH);
      return new Promise(() => {});
    }
    return data.user;
  } catch {
    setToken(null);
    window.location.replace(LOGIN_PATH);
    return new Promise(() => {});
  }
}
