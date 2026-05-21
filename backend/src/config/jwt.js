const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;

if (isProduction && !JWT_SECRET) {
  throw new Error(
    'JWT_SECRET não definido. Configure a variável de ambiente JWT_SECRET antes de iniciar em produção.'
  );
}

module.exports = {
  JWT_SECRET: JWT_SECRET || 'dev-jwt-secret-local-insecure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
};
