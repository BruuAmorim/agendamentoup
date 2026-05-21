// Entrypoint local — use: npm start ou npm run dev
require('dotenv').config();

const app = require('./app');
const { API_CONFIG } = require('./src/config/api');
const { initializeDatabase } = require('./src/config/initializeDatabase');

const PORT = API_CONFIG.port || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    await initializeDatabase();

    try {
      const SeedService = require('./src/services/seedService');
      await SeedService.ensureSeedUsers();
    } catch (e) {
      console.warn('⚠️ Seed de usuários:', e.message);
    }

    app.listen(PORT, HOST, () => {
      console.log('========================================');
      console.log('🚀 Cloudd Agenda API iniciada!');
      console.log(`📡 Porta: ${PORT}`);
      console.log(`🔗 API:   http://localhost:${PORT}/api`);
      console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();
