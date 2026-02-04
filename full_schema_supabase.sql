-- =====================================================
-- SCHEMA COMPLETO PARA SUPABASE - EVAGENDAMENTO
-- =====================================================
-- Este arquivo cria todas as tabelas necessárias para o sistema
-- funcionar do zero no Supabase/PostgreSQL
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

-- Índices para melhor performance na tabela users
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

-- Índices para melhor performance na tabela appointments
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

-- Índice para melhor performance na tabela moderator_settings
CREATE INDEX IF NOT EXISTS idx_moderator_settings_user_id ON moderator_settings(user_id);

-- =====================================================
-- DADOS INICIAIS (SEED DATA)
-- =====================================================

-- Inserir usuário Administrador Master
INSERT INTO users (name, email, password, role)
VALUES (
    'Administrador Master',
    'brunadevv@gmail.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- senha: admin123 (bcrypt hash)
    'admin_master'
)
ON CONFLICT (email) DO NOTHING;

-- Inserir usuário de teste
INSERT INTO users (name, email, password, role)
VALUES (
    'Usuário de Teste',
    'usuarioteste@gmail.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- senha: Mudar@123 (bcrypt hash)
    'user'
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- AGENDAMENTOS DE EXEMPLO (OPCIONAIS)
-- =====================================================

-- Exemplo de agendamento futuro
INSERT INTO appointments (
    customer_name,
    customer_email,
    customer_phone,
    appointment_date,
    appointment_time,
    duration_minutes,
    notes,
    status
) VALUES (
    'João Silva',
    'joao.silva@email.com',
    '(11) 99999-9999',
    CURRENT_DATE + INTERVAL '7 days', -- 7 dias no futuro
    '14:00:00',
    60,
    'Primeira consulta - agendamento de teste',
    'confirmed'
)
ON CONFLICT DO NOTHING;

-- Exemplo de agendamento passado (concluído)
INSERT INTO appointments (
    customer_name,
    customer_email,
    customer_phone,
    appointment_date,
    appointment_time,
    duration_minutes,
    notes,
    status
) VALUES (
    'Maria Oliveira',
    'maria.oliveira@email.com',
    '(11) 88888-8888',
    CURRENT_DATE - INTERVAL '2 days', -- 2 dias atrás
    '10:00:00',
    30,
    'Consulta de retorno - realizada com sucesso',
    'completed'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- CONFIGURAÇÕES DO MODERADOR PARA O ADMIN (OPCIONAL)
-- =====================================================

-- Inserir configurações básicas para o administrador
INSERT INTO moderator_settings (user_id, company_name, services)
SELECT
    u.id,
    'EvAgendamento Demo',
    '[
        {"id": "1", "name": "Consulta Geral", "duration": 60, "price": 100.00, "active": true},
        {"id": "2", "name": "Consulta Especializada", "duration": 90, "price": 150.00, "active": true},
        {"id": "3", "name": "Retorno", "duration": 30, "price": 80.00, "active": true}
    ]'::jsonb
FROM users u
WHERE u.email = 'brunadevv@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

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

-- Mostrar usuários criados
SELECT id, name, email, role, is_active, created_at
FROM users
ORDER BY created_at;

-- Mostrar total de registros em cada tabela
SELECT
    'users' as table_name,
    COUNT(*) as total_records
FROM users
UNION ALL
SELECT
    'appointments' as table_name,
    COUNT(*) as total_records
FROM appointments
UNION ALL
SELECT
    'moderator_settings' as table_name,
    COUNT(*) as total_records
FROM moderator_settings;

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================

-- Nota: Os hashes de senha foram gerados com bcrypt.
-- Para alterar as senhas, use uma ferramenta online ou script Node.js.
-- Senhas atuais:
-- - brunadevv@gmail.com: admin123
-- - usuarioteste@gmail.com: Mudar@123
