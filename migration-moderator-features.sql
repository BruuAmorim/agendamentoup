-- Migração para implementar funcionalidades do Moderador
-- Execute estes comandos no PostgreSQL

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

-- 2. Adicionar coluna service_type na tabela appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS service_type VARCHAR(100);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id ON moderator_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_type ON appointments(service_type);

-- 4. Atualizar modelo User (já feito no código, mas aqui para referência)
-- ALTER TYPE role_enum ADD VALUE 'moderator'; -- PostgreSQL permite adicionar valores a ENUM existente

-- Comentários explicativos:
-- - moderator_settings: Armazena configurações personalizadas do moderador
-- - service_type: Permite categorizar agendamentos por tipo de serviço
-- - Índices: Melhoram performance das consultas


