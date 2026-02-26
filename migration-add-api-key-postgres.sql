-- Migration: Adicionar campos de API Key na tabela users (PostgreSQL)
-- Execute este SQL diretamente no banco de dados PostgreSQL/Supabase

-- Adicionar colunas se não existirem
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS api_key_last_regenerated TIMESTAMP WITH TIME ZONE NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_api_key_hash 
ON users(api_key_hash) 
WHERE api_key_hash IS NOT NULL;

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('api_key_hash', 'api_key_created_at', 'api_key_last_regenerated')
ORDER BY column_name;







