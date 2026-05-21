-- Migração para atualizar constraint de role na tabela users
-- Execute este comando no PostgreSQL para permitir a role 'moderator'

-- 1. Remover a constraint antiga (se existir)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Adicionar a nova constraint com 'moderator' incluído
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin_master', 'moderator', 'user'));

-- 3. Verificar se já existem usuários com role 'moderator' (opcional)
-- SELECT * FROM users WHERE role = 'moderator';

-- 4. Comando alternativo se o banco já estiver criado:
-- Se você receber erro sobre constraint não existente, apenas execute:
-- ALTER TABLE users ADD CONSTRAINT users_role_check_new
--     CHECK (role IN ('admin_master', 'moderator', 'user'));


