-- Script SQL para criar a tabela moderator_settings
-- Execute este script diretamente no PostgreSQL para corrigir o erro 500

-- 1. Criar tabela moderator_settings
CREATE TABLE IF NOT EXISTS moderator_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  services JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id ON moderator_settings(user_id);

-- 3. Verificar se coluna service_type existe na tabela appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments'
    AND column_name = 'service_type'
  ) THEN
    ALTER TABLE appointments ADD COLUMN service_type VARCHAR(100);
    CREATE INDEX idx_appointments_service_type ON appointments(service_type);
    RAISE NOTICE 'Coluna service_type adicionada à tabela appointments';
  ELSE
    RAISE NOTICE 'Coluna service_type já existe na tabela appointments';
  END IF;
END $$;

-- 4. Verificar resultado
SELECT
  'moderator_settings' as table_name,
  COUNT(*) as total_records
FROM moderator_settings;

-- Comentários:
-- - user_id: Referência para o usuário moderador
-- - company_name: Nome personalizado da empresa
-- - services: Array JSON com os serviços oferecidos
-- - UNIQUE(user_id): Garante que cada moderador tenha apenas uma configuração


