const { User } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * Middleware de autenticação por API Key para integrações (ex: n8n).
 *
 * Aceita:
 *   - Header:  x-api-key: <chave>
 *   - Header:  Authorization: Bearer <chave>
 *
 * O processo usa prefix lookup para evitar bcrypt O(n):
 *   1. Extrai os primeiros 8 chars da chave (prefix).
 *   2. Filtra usuários no banco WHERE api_key_prefix = prefix.
 *   3. Faz bcrypt.compare apenas contra o(s) candidato(s) encontrado(s).
 */
async function verifyIntegrationApiKey(req, res, next) {
  try {
    const headerKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;
    const bearerKey = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    const provided = headerKey || bearerKey;

    if (!provided || provided.length < 8) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key não fornecida ou inválida',
      });
    }

    const prefix = provided.substring(0, 8);

    // Busca apenas empresas cujo prefix coincide — máximo 1 resultado esperado
    const candidatas = await User.findAll({
      where: { api_key_prefix: prefix },
      attributes: ['id', 'api_key_hash', 'name'],
    });

    let empresaEncontrada = null;
    for (const empresa of candidatas) {
      if (empresa.api_key_hash) {
        const isValid = await bcrypt.compare(provided, empresa.api_key_hash);
        if (isValid) {
          empresaEncontrada = empresa;
          break;
        }
      }
    }

    if (!empresaEncontrada) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key inválida',
      });
    }

    req.empresa = { id: empresaEncontrada.id, name: empresaEncontrada.name };
    next();
  } catch (error) {
    console.error('[apiKeyAuth] Erro ao verificar API Key:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar API Key',
    });
  }
}

module.exports = { verifyIntegrationApiKey };
