const express = require('express');
const router = express.Router();
const moderatorController = require('../controllers/moderatorController');
const empresaApiKeyMiddleware = require('../middleware/empresaApiKey.middleware');
const Funcionario = require('../models/Funcionario');

/**
 * Rotas públicas de informações da empresa (autenticadas por API Key)
 * Estas rotas não requerem JWT, apenas API Key no header x-api-key
 * O middleware empresaApiKeyMiddleware extrai automaticamente o empresa_id
 */

// GET /api/public/company/services - Buscar serviços da empresa via API Key
router.get('/services', empresaApiKeyMiddleware, async (req, res) => {
  try {
    // O middleware já injetou req.empresa_id
    const empresaId = req.empresa_id;
    
    if (!empresaId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        message: 'Empresa não identificada'
      });
    }

    // Buscar configurações da empresa
    const { query } = require('../config/database');
    const settingsQuery = `
      SELECT services, company_name
      FROM moderator_settings
      WHERE user_id = $1
      LIMIT 1
    `;

    const result = await query(settingsQuery, [empresaId]);

    let services = [];
    let companyName = null;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      companyName = row.company_name;
      
      // Parse JSON se necessário
      if (typeof row.services === 'string') {
        try {
          services = JSON.parse(row.services);
        } catch (e) {
          services = [];
        }
      } else if (Array.isArray(row.services)) {
        services = row.services;
      }
    }

    res.json({
      success: true,
      data: {
        company_name: companyName,
        services: services || []
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar serviços da empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar os serviços'
    });
  }
});

// GET /api/public/company/staff - Listar profissionais (funcionários) da empresa via API Key
router.get('/staff', empresaApiKeyMiddleware, async (req, res) => {
  try {
    const empresaId = req.empresa_id;

    if (!empresaId) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        message: 'Empresa não identificada'
      });
    }

    // Buscar funcionários ativos da empresa
    const funcionarios = await Funcionario.findAllByEmpresa(empresaId, { includeInactive: false });

    res.json({
      success: true,
      data: funcionarios.map((f) => f.toJSON())
    });
  } catch (error) {
    console.error('❌ Erro ao buscar funcionários públicos da empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar os profissionais da empresa'
    });
  }
});

module.exports = router;






