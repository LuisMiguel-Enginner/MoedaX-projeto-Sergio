import { getCurrentUser } from './session-user.js';

const LOGIN_PATH = 'login.html';

export async function requireAuth() {
  try {
    const user = await getCurrentUser();
    if (user) return user;
  } catch {
  }

  window.location.replace(LOGIN_PATH);
  return new Promise(() => {});
}
