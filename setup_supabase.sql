-- =====================================================
-- SETUP SUPABASE - APENAS TABELAS
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase para criar
-- todas as tabelas necessárias do zero.
-- =====================================================

-- Habilitar UUID extension (necessário para gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: USERS (Usuários)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin_master', 'moderator', 'user')),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- TABELA: APPOINTMENTS (Agendamentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_name);

-- =====================================================
-- TABELA: MODERATOR_SETTINGS (Configurações do Moderador)
-- =====================================================
CREATE TABLE IF NOT EXISTS moderator_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    services JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id ON moderator_settings(user_id);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Mostrar resumo das tabelas criadas
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('users', 'appointments', 'moderator_settings')
ORDER BY tablename;

-- Mostrar estrutura das tabelas
\d users;
\d appointments;
\d moderator_settings;

-- =====================================================
-- PRÓXIMOS PASSOS:
-- =====================================================
-- 1. Execute este arquivo no SQL Editor do Supabase
-- 2. Configure as variáveis de ambiente no Render:
--    - DATABASE_URL=postgres://usuario:senha@host:porta/banco
--    - NODE_ENV=production
--    - PORT=3000
--    - JWT_SECRET=sua_chave_segura
-- 3. Faça o deploy no Render
-- =====================================================
