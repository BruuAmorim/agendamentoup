const { query } = require('../config/database');

/**
 * Middleware que injeta o contexto do tenant na request.
 * Popula req.tenant com dados do plano e limites da empresa autenticada.
 * Não bloqueia — é informativo para controllers verificarem limites.
 */
const tenantContext = async (req, res, next) => {
  if (!req.user) return next();

  const empresaId = req.user.empresa_id ||
    (req.user.role === 'moderator' ? req.user.id : null);

  if (!empresaId) return next();

  try {
    const result = await query(`
      SELECT
        t.id as tenant_id, t.slug, t.name as tenant_name, t.status,
        p.id as plan_id, p.name as plan_name, p.slug as plan_slug, p.limits as plan_limits,
        n.id as niche_id, n.name as niche_name, n.slug as niche_slug
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN niches n ON n.id = t.niche_id
      WHERE t.user_id = $1
      LIMIT 1
    `, [empresaId]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      let limits = row.plan_limits;
      if (typeof limits === 'string') {
        try { limits = JSON.parse(limits); } catch { limits = {}; }
      }

      req.tenant = {
        id: row.tenant_id,
        slug: row.slug,
        name: row.tenant_name,
        status: row.status,
        plan: { id: row.plan_id, name: row.plan_name, slug: row.plan_slug },
        niche: { id: row.niche_id, name: row.niche_name, slug: row.niche_slug },
        limits: limits || {
          max_appointments_per_month: 100,
          max_staff: 5,
          max_units: 1,
          api_access: true,
          white_label: false,
        },
      };

      // Bloquear tenant suspenso/cancelado
      if (row.status === 'suspended') {
        return res.status(403).json({
          error: 'Conta suspensa',
          message: 'Sua conta está suspensa. Entre em contato com o suporte.',
        });
      }
      if (row.status === 'cancelled') {
        return res.status(403).json({
          error: 'Conta cancelada',
          message: 'Sua conta foi cancelada.',
        });
      }
    }
    next();
  } catch (err) {
    console.error('[tenantContext]', err.message);
    next();
  }
};

module.exports = { tenantContext };
