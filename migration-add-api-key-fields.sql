-- Migração para adicionar campos de API Key na tabela users
-- Execute este comando no banco de dados

-- Adicionar colunas de API Key (se não existirem)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS api_key_last_regenerated TIMESTAMP WITH TIME ZONE NULL;

-- Criar índice para melhor performance nas buscas por API Key
CREATE INDEX IF NOT EXISTS idx_users_api_key_hash ON users(api_key_hash) WHERE api_key_hash IS NOT NULL;

-- Para SQLite (se necessário):
-- ALTER TABLE users ADD COLUMN api_key_hash TEXT;
-- ALTER TABLE users ADD COLUMN api_key_created_at TEXT;
-- ALTER TABLE users ADD COLUMN api_key_last_regenerated TEXT;






