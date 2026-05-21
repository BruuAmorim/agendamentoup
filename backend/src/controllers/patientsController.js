const { query, sequelize } = require('../config/database');

function resolveEmpresaId(req) {
  if (!req.user) return null;
  return req.user.empresa_id ?? (req.user.role === 'moderator' ? req.user.id : null);
}

const CREATE_TABLE = (dialect) => dialect === 'sqlite' ? `
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    cpf TEXT,
    birth_date TEXT,
    health_insurance TEXT,
    notes TEXT,
    extra_fields TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
` : `
  CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    cpf VARCHAR(20),
    birth_date DATE,
    health_insurance VARCHAR(255),
    notes TEXT,
    extra_fields TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )
`;

async function ensureTable() {
  const dialect = sequelize.getDialect();
  await query(CREATE_TABLE(dialect), []);
  // Add extra_fields column if it doesn't exist yet (migration for existing tables)
  try {
    if (dialect === 'sqlite') {
      await query('ALTER TABLE patients ADD COLUMN extra_fields TEXT', []);
    } else {
      await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS extra_fields TEXT', []);
    }
  } catch { /* column already exists — ignore */ }
}

exports.list = async (req, res) => {
  try {
    const empresaId = resolveEmpresaId(req);
    if (!empresaId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    await ensureTable();
    const dialect = sequelize.getDialect();
    const matchCond = `CASE WHEN p.cpf IS NOT NULL AND p.cpf != '' THEN a.customer_cpf = p.cpf ELSE a.customer_name = p.name END`;
    const sql = dialect === 'sqlite' ? `
      SELECT p.*,
        (SELECT COUNT(*) FROM appointments a WHERE a.user_id = p.empresa_id AND ${matchCond}) as total_appointments,
        (SELECT COUNT(*) FROM appointments a WHERE a.user_id = p.empresa_id AND a.status = 'completed' AND ${matchCond}) as total_completed,
        (SELECT COUNT(*) FROM appointments a WHERE a.user_id = p.empresa_id AND a.status IN ('no_show','missed') AND ${matchCond}) as total_no_show,
        (SELECT MAX(a.appointment_date) FROM appointments a WHERE a.user_id = p.empresa_id AND ${matchCond}) as last_appointment
      FROM patients p WHERE p.empresa_id = ? ORDER BY p.name ASC
    ` : `
      SELECT p.*,
        (SELECT COUNT(*) FROM appointments a WHERE a.user_id = p.empresa_id AND ${matchCond}) as total_appointments,
        (SELECT COUNT(*) FROM appointments a WHERE a.user_id = p.empresa_id AND a.status = 'completed' AND ${matchCond}) as total_completed,
        (SELECT COUNT(*) FROM appointments a WHERE a.user_id = p.empresa_id AND a.status IN ('no_show','missed') AND ${matchCond}) as total_no_show,
        (SELECT MAX(a.appointment_date) FROM appointments a WHERE a.user_id = p.empresa_id AND ${matchCond}) as last_appointment
      FROM patients p WHERE p.empresa_id = $1 ORDER BY p.name ASC
    `;
    const result = await query(sql, [empresaId]);
    res.json({ success: true, patients: result.rows });
  } catch (e) {
    console.error('patientsController.list:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const empresaId = resolveEmpresaId(req);
    if (!empresaId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    await ensureTable();
    const { name, phone, email, cpf, birth_date, health_insurance, notes, extra_fields } = req.body || {};
    if (!name || String(name).trim().length < 2)
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    const dialect = sequelize.getDialect();
    const extraJson = extra_fields ? JSON.stringify(extra_fields) : null;
    const sql = dialect === 'sqlite'
      ? 'INSERT INTO patients (empresa_id,name,phone,email,cpf,birth_date,health_insurance,notes,extra_fields) VALUES (?,?,?,?,?,?,?,?,?)'
      : 'INSERT INTO patients (empresa_id,name,phone,email,cpf,birth_date,health_insurance,notes,extra_fields) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *';
    const params = [empresaId, String(name).trim(), phone||null, email||null, cpf||null, birth_date||null, health_insurance||null, notes||null, extraJson];
    const result = await query(sql, params);
    const patient = result.rows[0] || { id: null, empresa_id: empresaId, name, phone, email, cpf, birth_date, health_insurance, notes, extra_fields };
    res.json({ success: true, patient });
  } catch (e) {
    console.error('patientsController.create:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const empresaId = resolveEmpresaId(req);
    if (!empresaId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    const { id } = req.params;
    const { name, phone, email, cpf, birth_date, health_insurance, notes, extra_fields } = req.body || {};
    const dialect = sequelize.getDialect();
    const extraJson = extra_fields !== undefined ? JSON.stringify(extra_fields) : null;
    const sql = dialect === 'sqlite'
      ? 'UPDATE patients SET name=?,phone=?,email=?,cpf=?,birth_date=?,health_insurance=?,notes=?,extra_fields=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND empresa_id=?'
      : 'UPDATE patients SET name=$1,phone=$2,email=$3,cpf=$4,birth_date=$5,health_insurance=$6,notes=$7,extra_fields=$8,updated_at=CURRENT_TIMESTAMP WHERE id=$9 AND empresa_id=$10 RETURNING *';
    const params = [String(name||'').trim(), phone||null, email||null, cpf||null, birth_date||null, health_insurance||null, notes||null, extraJson, id, empresaId];
    const result = await query(sql, params);
    res.json({ success: true, patient: result.rows[0] || { id } });
  } catch (e) {
    console.error('patientsController.update:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Internal: find existing patient or create new one ────────────────────────
// Used by appointmentController after appointment creation.
async function findOrCreate(empresaId, { name, phone, email, cpf }) {
  await ensureTable();
  const dialect = sequelize.getDialect();
  const trimName = String(name || '').trim();

  // 1. Lookup by CPF (digits only match — highest priority identifier)
  if (cpf) {
    const cpfDigits = String(cpf).replace(/\D/g, '');
    if (cpfDigits.length === 11) {
      const sql = dialect === 'sqlite'
        ? "SELECT * FROM patients WHERE empresa_id = ? AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ? LIMIT 1"
        : "SELECT * FROM patients WHERE empresa_id = $1 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = $2 LIMIT 1";
      const r = await query(sql, [empresaId, cpfDigits]);
      if (r.rows[0]) return { patient: r.rows[0], created: false };
    }
  }

  // 2. Lookup by phone (most reliable identifier)
  if (phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length >= 7) {
      const sql = dialect === 'sqlite'
        ? 'SELECT * FROM patients WHERE empresa_id = ? AND phone = ? LIMIT 1'
        : 'SELECT * FROM patients WHERE empresa_id = $1 AND phone = $2 LIMIT 1';
      const r = await query(sql, [empresaId, phone]);
      if (r.rows[0]) return { patient: r.rows[0], created: false };
    }
  }

  // 2. Lookup by name (case-insensitive)
  if (trimName) {
    const sql = dialect === 'sqlite'
      ? 'SELECT * FROM patients WHERE empresa_id = ? AND lower(name) = lower(?) LIMIT 1'
      : 'SELECT * FROM patients WHERE empresa_id = $1 AND lower(name) = lower($2) LIMIT 1';
    const r = await query(sql, [empresaId, trimName]);
    if (r.rows[0]) return { patient: r.rows[0], created: false };
  }

  // 3. Create new patient record
  const sql = dialect === 'sqlite'
    ? 'INSERT INTO patients (empresa_id,name,phone,email) VALUES (?,?,?,?)'
    : 'INSERT INTO patients (empresa_id,name,phone,email) VALUES ($1,$2,$3,$4) RETURNING *';
  const r = await query(sql, [empresaId, trimName, phone || null, email || null]);
  return { patient: r.rows[0] || { empresa_id: empresaId, name: trimName, phone, email }, created: true };
}

exports.findOrCreate = findOrCreate;

// ── GET /patients/search?q=xxx ───────────────────────────────────────────────
exports.search = async (req, res) => {
  try {
    const empresaId = resolveEmpresaId(req);
    if (!empresaId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    await ensureTable();
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, patients: [] });
    const dialect = sequelize.getDialect();
    const like = `%${q}%`;
    const sql = dialect === 'sqlite'
      ? 'SELECT * FROM patients WHERE empresa_id = ? AND (phone LIKE ? OR name LIKE ? OR cpf LIKE ?) ORDER BY name ASC LIMIT 8'
      : 'SELECT * FROM patients WHERE empresa_id = $1 AND (phone ILIKE $2 OR name ILIKE $3 OR cpf ILIKE $4) ORDER BY name ASC LIMIT 8';
    const r = await query(sql, [empresaId, like, like, like]);
    res.json({ success: true, patients: r.rows });
  } catch (e) {
    console.error('patientsController.search:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const empresaId = resolveEmpresaId(req);
    if (!empresaId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    const { id } = req.params;
    const dialect = sequelize.getDialect();
    const sql = dialect === 'sqlite'
      ? 'DELETE FROM patients WHERE id=? AND empresa_id=?'
      : 'DELETE FROM patients WHERE id=$1 AND empresa_id=$2';
    await query(sql, [id, empresaId]);
    res.json({ success: true });
  } catch (e) {
    console.error('patientsController.remove:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};
