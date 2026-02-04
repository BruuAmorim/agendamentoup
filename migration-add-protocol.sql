-- Migração para adicionar coluna protocol na tabela appointments
-- Execute este script no seu banco de dados

-- SQLite
ALTER TABLE appointments ADD COLUMN protocol TEXT UNIQUE;

-- Se estiver usando PostgreSQL, use:
-- ALTER TABLE appointments ADD COLUMN protocol VARCHAR(20) UNIQUE;






