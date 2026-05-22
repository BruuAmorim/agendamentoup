const axios = require('axios');
const { query } = require('../config/database');

function getEmpresaId(req) {
  const u = req.user;
  if (u.role === 'moderator') return u.id;
  return u.empresa_id || u.parent_user_id;
}

const ALLOWED_TYPES = ['webhook', 'n8n', 'crm', 'whatsapp_api', 'ia_externa', 'outro'];

class ExternalIntegrationController {

  static async list(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const result = await query(
        'SELECT id, integration_name, type, api_url, webhook_url, status, config, created_at FROM external_integrations WHERE empresa_id = $1 ORDER BY created_at DESC',
        [empresaId]
      );
      const integrations = (result.rows || []).map(r => ({
        ...r,
        config: typeof r.config === 'string' ? JSON.parse(r.config || '{}') : (r.config || {}),
        api_key: undefined
      }));
      res.json({ success: true, integrations });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const { integration_name, type, api_url, api_key, webhook_url, config } = req.body;

      if (!integration_name) return res.status(400).json({ success: false, error: 'integration_name é obrigatório' });
      if (type && !ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: `type inválido. Use: ${ALLOWED_TYPES.join(', ')}` });
      }

      const configJson = JSON.stringify(config || {});
      const now = new Date().toISOString();

      const result = await query(
        `INSERT INTO external_integrations (empresa_id, integration_name, type, api_url, api_key, webhook_url, status, config, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'inactive', $7, $8, $8) RETURNING id`,
        [empresaId, integration_name, type || 'webhook', api_url || null, api_key || null, webhook_url || null, configJson, now]
      );

      const id = result.rows?.[0]?.id;
      res.status(201).json({ success: true, message: 'Integração criada com sucesso', id });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const { id } = req.params;
      const { integration_name, type, api_url, api_key, webhook_url, status, config } = req.body;

      const existing = await query(
        'SELECT id FROM external_integrations WHERE id = $1 AND empresa_id = $2',
        [id, empresaId]
      );
      if (!existing.rows?.length) {
        return res.status(404).json({ success: false, error: 'Integração não encontrada' });
      }

      if (type && !ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: `type inválido` });
      }

      const fields = [];
      const vals = [];
      let p = 1;

      const addField = (col, val) => { if (val !== undefined) { fields.push(`${col} = $${p++}`); vals.push(val); } };

      addField('integration_name', integration_name);
      addField('type', type);
      addField('api_url', api_url);
      if (api_key !== undefined) addField('api_key', api_key || null);
      addField('webhook_url', webhook_url);
      addField('status', status);
      if (config !== undefined) addField('config', JSON.stringify(config));

      if (!fields.length) return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });

      fields.push(`updated_at = $${p++}`);
      vals.push(new Date().toISOString(), id, empresaId);

      await query(
        `UPDATE external_integrations SET ${fields.join(', ')} WHERE id = $${p++} AND empresa_id = $${p}`,
        vals
      );

      res.json({ success: true, message: 'Integração atualizada com sucesso' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async remove(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const { id } = req.params;

      const result = await query(
        'DELETE FROM external_integrations WHERE id = $1 AND empresa_id = $2 RETURNING id',
        [id, empresaId]
      );

      if (!result.rows?.length) {
        return res.status(404).json({ success: false, error: 'Integração não encontrada' });
      }

      res.json({ success: true, message: 'Integração removida com sucesso' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async test(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const { id } = req.params;

      const result = await query(
        'SELECT * FROM external_integrations WHERE id = $1 AND empresa_id = $2',
        [id, empresaId]
      );
      const integration = result.rows?.[0];
      if (!integration) {
        return res.status(404).json({ success: false, error: 'Integração não encontrada' });
      }

      const targetUrl = integration.webhook_url || integration.api_url;
      if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'Nenhuma URL configurada para teste' });
      }

      const testPayload = {
        event: 'test_connection',
        source: 'Cloudd Agenda',
        timestamp: new Date().toISOString(),
        empresa_id: empresaId
      };

      const headers = { 'Content-Type': 'application/json' };
      if (integration.api_key) headers['x-api-key'] = integration.api_key;

      const response = await axios.post(targetUrl, testPayload, { headers, timeout: 10000 });

      await query(
        `UPDATE external_integrations SET status = 'active', updated_at = $1 WHERE id = $2`,
        [new Date().toISOString(), id]
      );

      res.json({
        success: true,
        message: 'Conexão testada com sucesso',
        httpStatus: response.status
      });
    } catch (err) {
      const status = err.response?.status;
      res.status(400).json({
        success: false,
        error: 'Falha no teste de conexão',
        detail: err.response?.data?.message || err.message,
        httpStatus: status
      });
    }
  }
}

module.exports = ExternalIntegrationController;
