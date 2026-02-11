const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

/**
 * Middleware de autenticação para integrações (ex: n8n)
 * 
 * Aceita:
 * - Header: x-api-key: <chave>
 * - OU Authorization: Bearer <chave>
 * 
 * Verifica a API Key no banco de dados por empresa (multi-tenant)
 */
async function verifyIntegrationApiKey(req, res, next) {
  try {
    const headerKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;
    const bearerKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const provided = headerKey || bearerKey;

    if (!provided) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key não fornecida'
      });
    }

    // Buscar todas as empresas que têm API Key configurada
    const empresas = await User.findAll({
      where: {
        api_key_hash: { [Op.ne]: null }
      },
      attributes: ['id', 'api_key_hash', 'name']
    });

    // Verificar se a API Key fornecida corresponde a alguma empresa
    let empresaEncontrada = null;
    for (const empresa of empresas) {
      if (empresa.api_key_hash) {
        try {
          const isValid = await bcrypt.compare(provided, empresa.api_key_hash);
          if (isValid) {
            empresaEncontrada = empresa;
            break;
          }
        } catch (error) {
          // Continuar verificando outras empresas
          console.warn(`Erro ao verificar API Key para empresa ${empresa.id}:`, error.message);
        }
      }
    }

    if (!empresaEncontrada) {
      return res.status(401).json({
        success: false,
        error: 'Não autorizado',
        message: 'API Key inválida ou não encontrada'
      });
    }

    // Adicionar informações da empresa ao request
    req.empresa = {
      id: empresaEncontrada.id,
      name: empresaEncontrada.name
    };

    // Compatibilidade: manter comportamento antigo se N8N_API_KEY estiver configurada
    const legacyKey = process.env.N8N_API_KEY;
    if (legacyKey && provided === legacyKey) {
      req.empresa = { id: null, name: 'Legacy Integration' };
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar API Key:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar API Key'
    });
  }
}

module.exports = {
  verifyIntegrationApiKey
};














