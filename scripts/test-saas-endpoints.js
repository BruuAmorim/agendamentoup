require('dotenv').config();
const http = require('http');

function req(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  try {
    const login = await req('/api/auth/login', 'POST', { email: 'admin@localhost.dev', password: 'Admin@Dev2024!' });
    const token = login.token;
    console.log('LOGIN:', token ? '✅ OK' : '❌ FALHOU', login.error || '');

    if (!token) process.exit(1);

    const stats = await req('/api/admin/saas/stats', 'GET', null, token);
    console.log('STATS:', stats.success ? '✅' : '❌', stats.error || '');
    if (stats.data) {
      console.log('  tenants_ativos:', stats.data.active_tenants);
      console.log('  total_appts:', stats.data.total_appointments);
      console.log('  planos:', stats.data.total_plans);
      console.log('  nichos:', stats.data.total_niches);
    }

    const plans = await req('/api/admin/saas/plans', 'GET', null, token);
    console.log('PLANS:', plans.success ? '✅' : '❌', plans.error || '');
    if (plans.data) plans.data.forEach(p => console.log(`  - ${p.name} (R$${p.price}) | tenants: ${p.tenant_count}`));

    const niches = await req('/api/admin/saas/niches', 'GET', null, token);
    console.log('NICHES:', niches.success ? '✅' : '❌', niches.error || '');
    if (niches.data) niches.data.forEach(n => console.log(`  - ${n.name} | tenants: ${n.tenant_count}`));

    const tenants = await req('/api/admin/saas/tenants', 'GET', null, token);
    console.log('TENANTS:', tenants.success ? '✅' : '❌', tenants.error || '');
    if (tenants.data) tenants.data.forEach(t => console.log(`  - ${t.name} [${t.status}] plano: ${t.plan_name}`));

    // Testar que n8n ainda funciona (deve retornar 401 sem API Key, não 404)
    const n8n = await req('/api/n8n/appointments', 'GET', null, null);
    console.log('N8N endpoint:', n8n.error === 'Rota não encontrada' ? '❌ QUEBROU' : '✅ Existe (responde ' + JSON.stringify(n8n).substring(0,60) + ')');

    // Testar public appointments (deve retornar 400/401, não 404)
    const pub = await req('/api/public/appointments', 'POST', {}, null);
    console.log('Public /appointments:', pub.error === 'Rota não encontrada' ? '❌ QUEBROU' : '✅ Existe');

    process.exit(0);
  } catch(e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
