-- Migration: Adicionar campos de API Key para empresas na tabela users
-- Execute este SQL diretamente no banco de dados PostgreSQL/Supabase

-- Adicionar coluna api_key_prefix se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(50) NULL;

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('api_key_hash', 'api_key_prefix', 'api_key_created_at', 'api_key_last_regenerated')
ORDER BY column_name;







