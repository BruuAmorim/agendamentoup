const aiService = require('../services/aiAssistantService');
const { query } = require('../config/database');

function getEmpresaId(req) {
  const u = req.user;
  if (u.role === 'moderator') return u.id;
  return u.empresa_id || u.parent_user_id;
}

class AIAssistantController {

  static async getConfig(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const config = await aiService.getConfig(empresaId);

      if (!config) {
        return res.json({
          success: true,
          config: {
            is_active: false,
            ai_provider: 'openai',
            ai_model: 'gpt-4o-mini',
            assistant_name: 'Assistente',
            system_prompt: '',
            temperature: 0.7,
            service_hours_start: '08:00',
            service_hours_end: '18:00',
            service_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            away_message: 'No momento não estou disponível. Retorno em breve!',
            human_transfer_keyword: 'falar com atendente',
            response_delay_seconds: 2,
            has_api_key: false
          }
        });
      }

      let serviceDays = config.service_days;
      if (typeof serviceDays === 'string') {
        try { serviceDays = JSON.parse(serviceDays); } catch { serviceDays = []; }
      }

      res.json({
        success: true,
        config: {
          ...config,
          service_days: serviceDays,
          api_key_encrypted: undefined,
          has_api_key: !!config.api_key_encrypted
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async saveConfig(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const {
        is_active, ai_provider, ai_model, api_key,
        assistant_name, system_prompt, temperature,
        service_hours_start, service_hours_end, service_days,
        away_message, human_transfer_keyword, response_delay_seconds
      } = req.body;

      const validProviders = ['openai', 'anthropic'];
      if (ai_provider && !validProviders.includes(ai_provider)) {
        return res.status(400).json({ success: false, error: 'ai_provider inválido. Use: openai ou anthropic' });
      }

      const serviceDaysJson = Array.isArray(service_days)
        ? JSON.stringify(service_days)
        : (service_days || null);

      const existing = await aiService.getConfig(empresaId);
      const now = new Date().toISOString();

      if (!existing) {
        const cols = ['empresa_id', 'is_active', 'ai_provider', 'ai_model', 'assistant_name',
          'system_prompt', 'temperature', 'service_hours_start', 'service_hours_end',
          'service_days', 'away_message', 'human_transfer_keyword', 'response_delay_seconds',
          'created_at', 'updated_at'];

        const vals = [
          empresaId,
          is_active ? 1 : 0,
          ai_provider || 'openai',
          ai_model || 'gpt-4o-mini',
          assistant_name || 'Assistente',
          system_prompt || null,
          temperature !== undefined ? parseFloat(temperature) : 0.7,
          service_hours_start || '08:00',
          service_hours_end || '18:00',
          serviceDaysJson || '["monday","tuesday","wednesday","thursday","friday"]',
          away_message || 'No momento não estou disponível. Retorno em breve!',
          human_transfer_keyword || 'falar com atendente',
          response_delay_seconds !== undefined ? parseInt(response_delay_seconds) : 2,
          now, now
        ];

        if (api_key) {
          cols.splice(cols.indexOf('created_at'), 0, 'api_key_encrypted');
          vals.splice(vals.length - 2, 0, api_key);
        }

        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        await query(`INSERT INTO ai_assistant_config (${cols.join(', ')}) VALUES (${placeholders})`, vals);
      } else {
        const fields = [];
        const vals = [];
        let p = 1;

        const set = (col, val) => { if (val !== undefined) { fields.push(`${col} = $${p++}`); vals.push(val); } };

        if (is_active !== undefined) set('is_active', is_active ? 1 : 0);
        set('ai_provider', ai_provider);
        set('ai_model', ai_model);
        set('assistant_name', assistant_name);
        if (system_prompt !== undefined) set('system_prompt', system_prompt || null);
        if (temperature !== undefined) set('temperature', parseFloat(temperature));
        set('service_hours_start', service_hours_start);
        set('service_hours_end', service_hours_end);
        if (serviceDaysJson) set('service_days', serviceDaysJson);
        if (away_message !== undefined) set('away_message', away_message);
        if (human_transfer_keyword !== undefined) set('human_transfer_keyword', human_transfer_keyword);
        if (response_delay_seconds !== undefined) set('response_delay_seconds', parseInt(response_delay_seconds));
        if (api_key) set('api_key_encrypted', api_key);

        fields.push(`updated_at = $${p++}`);
        vals.push(now, empresaId);

        await query(
          `UPDATE ai_assistant_config SET ${fields.join(', ')} WHERE empresa_id = $${p}`,
          vals
        );
      }

      res.json({ success: true, message: 'Configuração do assistente IA salva com sucesso' });
    } catch (err) {
      console.error('[AI] saveConfig error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async testMessage(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const { message } = req.body;

      if (!message) return res.status(400).json({ success: false, error: 'message é obrigatório' });

      const response = await aiService.testMessage(empresaId, message);
      res.json({ success: true, response });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async toggle(req, res) {
    try {
      const empresaId = getEmpresaId(req);
      const { active } = req.body;

      const existing = await aiService.getConfig(empresaId);
      const now = new Date().toISOString();

      if (!existing) {
        await query(
          `INSERT INTO ai_assistant_config (empresa_id, is_active, created_at, updated_at) VALUES ($1, $2, $3, $3)`,
          [empresaId, active ? 1 : 0, now]
        );
      } else {
        await query(
          `UPDATE ai_assistant_config SET is_active = $1, updated_at = $2 WHERE empresa_id = $3`,
          [active ? 1 : 0, now, empresaId]
        );
      }

      res.json({
        success: true,
        message: active ? 'Assistente IA ativado' : 'Assistente IA desativado',
        active: !!active
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AIAssistantController;
