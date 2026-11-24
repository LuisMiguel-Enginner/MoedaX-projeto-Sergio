function readBody(request) {
  if (request.body !== undefined && request.body !== null) {
    if (Buffer.isBuffer(request.body)) {
      const raw = request.body.toString('utf8').trim();
      if (!raw) return Promise.resolve({});
      try {
        return Promise.resolve(JSON.parse(raw));
      } catch {
        return Promise.reject(Object.assign(new Error('JSON inválido'), { statusCode: 400 }));
      }
    }
    if (typeof request.body === 'object') {
      return Promise.resolve(request.body);
    }
    if (typeof request.body === 'string') {
      const raw = request.body.trim();
      if (!raw) return Promise.resolve({});
      try {
        return Promise.resolve(JSON.parse(raw));
      } catch {
        return Promise.reject(Object.assign(new Error('JSON inválido'), { statusCode: 400 }));
      }
    }
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

module.exports = { readBody };
