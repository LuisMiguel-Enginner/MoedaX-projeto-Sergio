const { AppError } = require('../exceptions/AppError');
const { sendError } = require('../utils/response');

function handleError(error, response) {
  if (error instanceof AppError) {
    return sendError(response, error.statusCode, error.message, error.details);
  }

  if (error && error.statusCode) {
    return sendError(response, error.statusCode, error.message || 'Erro na requisição');
  }

  if (error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return sendError(response, 409, 'Registro já existe (conflito de unicidade)');
  }

  if (error && String(error.code || '').startsWith('SQLITE_CONSTRAINT')) {
    return sendError(response, 409, 'Violação de restrição no banco de dados');
  }

  console.error(error);
  return sendError(response, 500, 'Erro interno do servidor');
}

function asyncHandler(handler) {
  return async (request, response, context) => {
    try {
      await handler(request, response, context);
    } catch (error) {
      handleError(error, response);
    }
  };
}

module.exports = { handleError, asyncHandler };
