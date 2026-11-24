import { api, setToken } from './auth-api.js';

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export async function getCurrentUser() {
  try {
    const data = await api('/api/auth/me');
    const user = data.user;
    const fullName = user.fullName || user.full_name || 'Usuário';
    return {
      id: user.id,
      email: user.email,
      fullName,
      firstName: user.firstName || fullName.split(/\s+/)[0],
      initials: getInitials(fullName),
      accountType: user.accountType || user.role || 'investidor',
      accountLabel: user.accountLabel || (user.role === 'administrador' ? 'Administrador' : 'Conta pessoal')
    };
  } catch {
    return null;
  }
}

export async function signOut() {
  setToken(null);
  localStorage.removeItem('moedax_demo_mode');
  localStorage.removeItem('moedax_demo_name');
  localStorage.removeItem('moedax_demo_email');
  window.location.replace('login.html');
}
