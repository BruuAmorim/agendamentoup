-- Migração para adicionar horário de funcionamento e sistema de funcionários
-- Execute estes comandos no PostgreSQL ou SQLite

-- 1. Adicionar campos de horário de funcionamento na tabela moderator_settings
ALTER TABLE moderator_settings
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb;

ALTER TABLE moderator_settings
ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb;

ALTER TABLE moderator_settings
ADD COLUMN IF NOT EXISTS employee_limit INTEGER DEFAULT 10;

-- 2. Criar tabela de funcionários (usuários vinculados a moderadores)
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moderator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, moderator_id)
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_moderator_id ON employees(moderator_id);

-- Para SQLite (se necessário):
-- ALTER TABLE moderator_settings ADD COLUMN working_hours TEXT DEFAULT '{"start": "09:00", "end": "18:00"}';
-- ALTER TABLE moderator_settings ADD COLUMN working_days TEXT DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]';
-- ALTER TABLE moderator_settings ADD COLUMN employee_limit INTEGER DEFAULT 10;
-- CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, moderator_id INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, moderator_id));

