const { query } = require('../config/database');
const { sequelize } = require('../config/database');

function parseJson(val) {
  if (typeof val === 'object' && val !== null) return val;
  try { return JSON.parse(val); } catch { return {}; }
}

function toSlug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// ── Platform Stats ────────────────────────────────────────────────────────────
exports.getPlatformStats = async (req, res) => {
  try {
    const dialect = sequelize.getDialect();

    const [totals, byPlan, byNiche, byStatus, recentTenants] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM tenants) as total_tenants,
          (SELECT COUNT(*) FROM tenants WHERE status = 'active') as active_tenants,
          (SELECT COUNT(*) FROM users WHERE role = 'moderator') as total_empresas,
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM appointments) as total_appointments,
          (SELECT COUNT(*) FROM plans WHERE is_active = ${dialect === 'sqlite' ? '1' : 'TRUE'}) as total_plans,
          (SELECT COUNT(*) FROM niches WHERE is_active = ${dialect === 'sqlite' ? '1' : 'TRUE'}) as total_niches
      `, []),
      query(`
        SELECT p.name as plan_name, p.slug, COUNT(t.id) as count
        FROM plans p
        LEFT JOIN tenants t ON t.plan_id = p.id
        GROUP BY p.id, p.name, p.slug
        ORDER BY count DESC
      `, []),
      query(`
        SELECT n.name as niche_name, n.slug, COUNT(t.id) as count
        FROM niches n
        LEFT JOIN tenants t ON t.niche_id = n.id
        GROUP BY n.id, n.name, n.slug
        ORDER BY count DESC
      `, []),
      query(`
        SELECT status, COUNT(*) as count FROM tenants GROUP BY status
      `, []),
      query(`
        SELECT t.id, t.name, t.status, t.created_at, p.name as plan_name
        FROM tenants t
        LEFT JOIN plans p ON t.plan_id = p.id
        ORDER BY t.created_at DESC
        LIMIT 5
      `, []),
    ]);

    const stats = totals.rows[0] || {};
    return res.json({
      success: true,
      data: {
        total_tenants: parseInt(stats.total_tenants) || 0,
        active_tenants: parseInt(stats.active_tenants) || 0,
        total_empresas: parseInt(stats.total_empresas) || 0,
        total_users: parseInt(stats.total_users) || 0,
        total_appointments: parseInt(stats.total_appointments) || 0,
        total_plans: parseInt(stats.total_plans) || 0,
        total_niches: parseInt(stats.total_niches) || 0,
        by_plan: byPlan.rows.map(r => ({ ...r, count: parseInt(r.count) || 0 })),
        by_niche: byNiche.rows.map(r => ({ ...r, count: parseInt(r.count) || 0 })),
        by_status: byStatus.rows.map(r => ({ ...r, count: parseInt(r.count) || 0 })),
        recent_tenants: recentTenants.rows,
      },
    });
  } catch (err) {
    console.error('[adminSaas] getPlatformStats:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao obter estatísticas da plataforma' });
  }
};

// ── Tenants ───────────────────────────────────────────────────────────────────
exports.listTenants = async (req, res) => {
  try {
    const { status, plan_id, niche_id, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const dialect = sequelize.getDialect();

    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
    if (plan_id) { conditions.push(`t.plan_id = $${idx++}`); params.push(plan_id); }
    if (niche_id) { conditions.push(`t.niche_id = $${idx++}`); params.push(niche_id); }
    if (search) {
      conditions.push(`(t.name LIKE $${idx} OR u.email LIKE $${idx++})`);
      params.push(`%${search}%`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await query(`
      SELECT
        t.id, t.user_id, t.plan_id, t.niche_id, t.slug, t.name, t.status, t.created_at,
        u.email as owner_email, u.name as owner_name,
        p.name as plan_name, p.slug as plan_slug, p.price as plan_price,
        n.name as niche_name, n.slug as niche_slug,
        0 as total_appointments
      FROM tenants t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN niches n ON n.id = t.niche_id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(limit), offset]);

    const countResult = await query(
      `SELECT COUNT(*) as total FROM tenants t INNER JOIN users u ON u.id = t.user_id ${where}`,
      params
    );

    return res.json({
      success: true,
      data: rows.rows,
      pagination: {
        total: parseInt(countResult.rows[0]?.total) || 0,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error('[adminSaas] listTenants:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao listar tenants' });
  }
};

exports.getTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT
        t.*, u.email as owner_email, u.name as owner_name, u.isActive as owner_active,
        p.name as plan_name, p.slug as plan_slug, p.price as plan_price, p.limits as plan_limits,
        n.name as niche_name, n.slug as niche_slug,
        (SELECT COUNT(*) FROM funcionarios f WHERE f.empresa_id = t.user_id AND f.ativo = 1) as total_staff
      FROM tenants t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN niches n ON n.id = t.niche_id
      WHERE t.id = $1
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Tenant não encontrado' });
    }

    const tenant = result.rows[0];
    tenant.plan_limits = parseJson(tenant.plan_limits);
    tenant.settings = parseJson(tenant.settings);
    return res.json({ success: true, data: tenant });
  } catch (err) {
    console.error('[adminSaas] getTenant:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao buscar tenant' });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, niche_id, status, name, settings, email, password } = req.body;
    const dialect = sequelize.getDialect();

    const allowed = ['active', 'suspended', 'cancelled'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido' });
    }

    // ── Atualiza tabela tenants ───────────────────────────────
    const sets = [];
    const params = [];
    let idx = 1;
    if (name !== undefined)     { sets.push(`name = $${idx++}`);     params.push(name); }
    if (plan_id !== undefined)  { sets.push(`plan_id = $${idx++}`);  params.push(plan_id || null); }
    if (niche_id !== undefined) { sets.push(`niche_id = $${idx++}`); params.push(niche_id || null); }
    if (status !== undefined)   { sets.push(`status = $${idx++}`);   params.push(status); }
    if (settings !== undefined) {
      sets.push(`settings = $${idx++}`);
      params.push(dialect === 'sqlite' ? JSON.stringify(settings) : settings);
    }

    if (sets.length) {
      sets.push(`updated_at = $${idx++}`);
      params.push(new Date().toISOString());
      params.push(id);
      await query(`UPDATE tenants SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    }

    // ── Atualiza usuário vinculado (email / senha / status) ──
    const tenantRow = await query('SELECT user_id FROM tenants WHERE id = $1', [id]);
    const userId = tenantRow.rows[0]?.user_id;

    if (userId) {
      const userSets = [];
      const userParams = [];
      let ui = 1;

      if (email && email.trim()) {
        const normalized = email.toLowerCase().trim();
        const conflict = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [normalized, userId]);
        if (conflict.rows.length) {
          return res.status(409).json({ success: false, error: 'Este e-mail já está em uso por outra conta' });
        }
        userSets.push(`email = $${ui++}`);
        userParams.push(normalized);
      }

      if (password && password.length >= 6) {
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(password, 12);
        userSets.push(`password = $${ui++}`);
        userParams.push(hashed);
      }

      if (status === 'suspended' || status === 'cancelled') {
        userSets.push(`"isActive" = $${ui++}`);
        userParams.push(dialect === 'sqlite' ? 0 : false);
      } else if (status === 'active') {
        userSets.push(`"isActive" = $${ui++}`);
        userParams.push(dialect === 'sqlite' ? 1 : true);
      }

      if (userSets.length) {
        userParams.push(userId);
        await query(`UPDATE users SET ${userSets.join(', ')} WHERE id = $${ui}`, userParams);
      }
    }

    return res.json({ success: true, message: 'Empresa atualizada com sucesso' });
  } catch (err) {
    console.error('[adminSaas] updateTenant:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar empresa' });
  }
};

exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantRow = await query('SELECT user_id FROM tenants WHERE id = $1', [id]);
    if (!tenantRow.rows.length) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }
    const userId = tenantRow.rows[0]?.user_id;
    await query('DELETE FROM tenants WHERE id = $1', [id]);
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
    return res.json({ success: true, message: 'Empresa removida com sucesso' });
  } catch (err) {
    console.error('[adminSaas] deleteTenant:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao remover empresa' });
  }
};

// ── Plans ─────────────────────────────────────────────────────────────────────
exports.listPlans = async (req, res) => {
  try {
    const dialect = sequelize.getDialect();
    const result = await query(`
      SELECT p.*, (SELECT COUNT(*) FROM tenants t WHERE t.plan_id = p.id) as tenant_count
      FROM plans p
      ORDER BY p.price ASC
    `, []);

    const plans = result.rows.map(p => ({
      ...p,
      limits: parseJson(p.limits),
      features: parseJson(p.features),
      is_active: dialect === 'sqlite' ? Boolean(p.is_active) : p.is_active,
      tenant_count: parseInt(p.tenant_count) || 0,
    }));

    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error('[adminSaas] listPlans:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao listar planos' });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, price = 0, billing_cycle = 'monthly', limits = {}, features = {} } = req.body;
    const dialect = sequelize.getDialect();

    if (!name) return res.status(400).json({ success: false, error: 'Nome do plano é obrigatório' });

    const slug = toSlug(name);
    const existing = await query('SELECT id FROM plans WHERE slug = $1', [slug]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, error: 'Já existe um plano com esse nome' });
    }

    if (dialect === 'sqlite') {
      await query(
        `INSERT INTO plans (name, slug, price, billing_cycle, limits, features) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, slug, price, billing_cycle, JSON.stringify(limits), JSON.stringify(features)]
      );
    } else {
      await query(
        `INSERT INTO plans (name, slug, price, billing_cycle, limits, features) VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, slug, price, billing_cycle, limits, features]
      );
    }

    return res.status(201).json({ success: true, message: 'Plano criado com sucesso', slug });
  } catch (err) {
    console.error('[adminSaas] createPlan:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao criar plano' });
  }
};

// ── Create company (moderator user + tenant) ──────────────────────────────────
exports.createEmpresa = async (req, res) => {
  try {
    const { User, Tenant, Plan, Niche } = require('../models');
    const { name, email, password, niche_id, plan_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'name, email e password são obrigatórios' });
    }

    const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (exists) return res.status(409).json({ success: false, error: 'E-mail já cadastrado' });

    const user = await User.create({
      name, email: email.toLowerCase().trim(), password, role: 'moderator', isActive: true,
    });

    const slug = toSlug(name) + '-' + user.id;
    const tenant = await Tenant.create({
      user_id: user.id, slug, name,
      niche_id: niche_id || null,
      plan_id: plan_id || null,
      status: 'active',
    });

    // Generate API key
    try {
      const ApiKeyService = require('../services/apiKeyService');
      await ApiKeyService.generateAndSaveApiKey(user.id);
    } catch (e) { /* non-blocking */ }

    return res.status(201).json({ success: true, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[adminSaas] createEmpresa:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao criar empresa' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, billing_cycle, limits, features, is_active } = req.body;
    const dialect = sequelize.getDialect();

    const sets = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
    if (price !== undefined) { sets.push(`price = $${idx++}`); params.push(price); }
    if (billing_cycle !== undefined) { sets.push(`billing_cycle = $${idx++}`); params.push(billing_cycle); }
    if (limits !== undefined) {
      sets.push(`limits = $${idx++}`);
      params.push(dialect === 'sqlite' ? JSON.stringify(limits) : limits);
    }
    if (features !== undefined) {
      sets.push(`features = $${idx++}`);
      params.push(dialect === 'sqlite' ? JSON.stringify(features) : features);
    }
    if (is_active !== undefined) {
      sets.push(`is_active = $${idx++}`);
      params.push(dialect === 'sqlite' ? (is_active ? 1 : 0) : is_active);
    }

    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });

    sets.push(`updated_at = $${idx++}`);
    params.push(new Date().toISOString());
    params.push(id);

    await query(`UPDATE plans SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return res.json({ success: true, message: 'Plano atualizado com sucesso' });
  } catch (err) {
    console.error('[adminSaas] updatePlan:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar plano' });
  }
};

// ── Niches ────────────────────────────────────────────────────────────────────
exports.listNiches = async (req, res) => {
  try {
    const dialect = sequelize.getDialect();
    const result = await query(`
      SELECT n.*, (SELECT COUNT(*) FROM tenants t WHERE t.niche_id = n.id) as tenant_count
      FROM niches n
      ORDER BY n.name ASC
    `, []);

    const niches = result.rows.map(n => ({
      ...n,
      config: parseJson(n.config),
      field_templates: parseJson(n.field_templates),
      is_active: dialect === 'sqlite' ? Boolean(n.is_active) : n.is_active,
      tenant_count: parseInt(n.tenant_count) || 0,
    }));

    return res.json({ success: true, data: niches });
  } catch (err) {
    console.error('[adminSaas] listNiches:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao listar nichos' });
  }
};

exports.createNiche = async (req, res) => {
  try {
    const { name, description = '', config = {}, field_templates = [] } = req.body;
    const dialect = sequelize.getDialect();

    if (!name) return res.status(400).json({ success: false, error: 'Nome do nicho é obrigatório' });

    const slug = toSlug(name);
    const existing = await query('SELECT id FROM niches WHERE slug = $1', [slug]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, error: 'Já existe um nicho com esse nome' });
    }

    if (dialect === 'sqlite') {
      await query(
        `INSERT INTO niches (name, slug, description, config, field_templates) VALUES (?, ?, ?, ?, ?)`,
        [name, slug, description, JSON.stringify(config), JSON.stringify(field_templates)]
      );
    } else {
      await query(
        `INSERT INTO niches (name, slug, description, config, field_templates) VALUES ($1, $2, $3, $4, $5)`,
        [name, slug, description, config, field_templates]
      );
    }

    return res.status(201).json({ success: true, message: 'Nicho criado com sucesso', slug });
  } catch (err) {
    console.error('[adminSaas] createNiche:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao criar nicho' });
  }
};

exports.impersonateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const jwt = require('jsonwebtoken');

    const result = await query(`
      SELECT u.id, u.email, u.name, u.role
      FROM tenants t
      INNER JOIN users u ON u.id = t.user_id
      WHERE t.id = $1 AND t.status = 'active'
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada ou inativa' });
    }

    const tenantUser = result.rows[0];
    const secret = process.env.JWT_SECRET || 'cloudd-secret-key-2024';
    const impersonateToken = jwt.sign(
      { id: tenantUser.id, email: tenantUser.email, role: tenantUser.role, _imp: req.user.id },
      secret,
      { expiresIn: '4h' }
    );

    return res.json({
      success: true,
      token: impersonateToken,
      user: { id: tenantUser.id, email: tenantUser.email, name: tenantUser.name, role: tenantUser.role },
    });
  } catch (err) {
    console.error('[adminSaas] impersonateTenant:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao acessar empresa' });
  }
};

exports.updateNiche = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, config, field_templates, is_active } = req.body;
    const dialect = sequelize.getDialect();

    const sets = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
    if (config !== undefined) {
      sets.push(`config = $${idx++}`);
      params.push(dialect === 'sqlite' ? JSON.stringify(config) : config);
    }
    if (field_templates !== undefined) {
      sets.push(`field_templates = $${idx++}`);
      params.push(dialect === 'sqlite' ? JSON.stringify(field_templates) : field_templates);
    }
    if (is_active !== undefined) {
      sets.push(`is_active = $${idx++}`);
      params.push(dialect === 'sqlite' ? (is_active ? 1 : 0) : is_active);
    }

    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });

    sets.push(`updated_at = $${idx++}`);
    params.push(new Date().toISOString());
    params.push(id);

    await query(`UPDATE niches SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return res.json({ success: true, message: 'Nicho atualizado com sucesso' });
  } catch (err) {
    console.error('[adminSaas] updateNiche:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar nicho' });
  }
};
