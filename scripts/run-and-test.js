const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
process.env.NODE_ENV = 'development';

function req(p, method, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3000, path: p, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function waitForServer(maxMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function try_() {
      http.get('http://localhost:3000/api/health', res => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() - start > maxMs) return reject(new Error('Timeout esperando servidor'));
        setTimeout(try_, 500);
      });
    }
    try_();
  });
}

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'backend/server.js')], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  srv.stdout.on('data', d => process.stdout.write('[server] ' + d));
  srv.stderr.on('data', d => process.stderr.write('[server] ' + d));

  try {
    await waitForServer(12000);
    console.log('\n=== TESTANDO ENDPOINTS ===\n');

    const login = await req('/api/auth/login', 'POST', { email: 'admin@localhost.dev', password: 'Admin@Dev2024!' });
    const token = login.token;
    console.log('LOGIN:', token ? '✅ OK' : '❌ ' + (login.error || 'sem token'));
    if (!token) { srv.kill(); process.exit(1); }

    const stats = await req('/api/admin/saas/stats', 'GET', null, token);
    console.log('GET /admin/saas/stats:', stats.success ? '✅' : '❌ ' + (stats.error || JSON.stringify(stats)));
    if (stats.data) {
      console.log('  active_tenants:', stats.data.active_tenants, '| appointments:', stats.data.total_appointments,
        '| plans:', stats.data.total_plans, '| niches:', stats.data.total_niches);
      console.log('  by_plan:', stats.data.by_plan?.map(p => p.plan_name + ':' + p.count).join(', '));
    }

    const plans = await req('/api/admin/saas/plans', 'GET', null, token);
    console.log('GET /admin/saas/plans:', plans.success ? '✅' : '❌ ' + plans.error);
    plans.data?.forEach(p => console.log(`  - ${p.name} R$${p.price} | ${p.tenant_count} empresa(s)`));

    const niches = await req('/api/admin/saas/niches', 'GET', null, token);
    console.log('GET /admin/saas/niches:', niches.success ? '✅' : '❌ ' + niches.error);
    niches.data?.forEach(n => console.log(`  - ${n.name} | ${n.tenant_count} empresa(s)`));

    const tenants = await req('/api/admin/saas/tenants', 'GET', null, token);
    console.log('GET /admin/saas/tenants:', tenants.success ? '✅' : '❌ ' + tenants.error);
    tenants.data?.forEach(t => console.log(`  - ${t.name} [${t.status}] plano: ${t.plan_name}`));

    // Integridade: endpoints n8n e public não devem quebrar
    const n8n = await req('/api/n8n/appointments', 'GET', null, null);
    console.log('N8N /api/n8n/appointments:', n8n.error === 'Rota não encontrada' ? '❌ QUEBROU' : '✅ Responde (401/403 esperado)');

    const pub = await req('/api/public/appointments', 'POST', { customer_name: 'x', appointment_date: '2026-06-01', appointment_time: '09:00' }, null);
    console.log('Public /api/public/appointments:', pub.error === 'Rota não encontrada' ? '❌ QUEBROU' : '✅ Responde (4xx esperado)');

    console.log('\n=== TODOS OS TESTES CONCLUÍDOS ===');
  } catch (e) {
    console.error('❌ ERRO:', e.message);
  } finally {
    srv.kill();
    process.exit(0);
  }
})();
