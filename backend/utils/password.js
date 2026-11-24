const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const derived = await scrypt(password, salt, 64);
  const hashBuffer = Buffer.from(hash, 'hex');
  if (hashBuffer.length !== derived.length) return false;
  return crypto.timingSafeEqual(hashBuffer, derived);
}

module.exports = { hashPassword, verifyPassword };
