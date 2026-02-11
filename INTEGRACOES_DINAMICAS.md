# 🔗 Sistema de Integrações Dinâmicas - Implementação Completa

## ✅ O que foi implementado

A tela `/admin/integrations.html` foi transformada em uma tela **totalmente dinâmica e vinculada à empresa logada**, sem valores hardcoded.

### 📋 Funcionalidades Implementadas

1. **Backend - Rotas Protegidas**
   - `GET /api/admin/integrations` - Retorna informações de integração da empresa logada
   - `POST /api/admin/generate-api-key` - Gera nova API Key para a empresa

2. **Banco de Dados**
   - Campos adicionados na tabela `users`:
     - `api_key_hash` - Hash da API Key (bcrypt)
     - `api_key_created_at` - Data de criação
     - `api_key_last_regenerated` - Data da última regeneração

3. **Segurança**
   - API Keys são armazenadas como hash (bcrypt)
   - API Key completa é exibida apenas uma vez após geração
   - API Keys são mascaradas na exibição (ex: `9f3a8f********a6d2`)
   - Middleware atualizado para verificar API Key por empresa (multi-tenant)

4. **Frontend Dinâmico**
   - Carrega dados automaticamente do backend
   - Exibe status da API Key (configurada/não configurada)
   - Permite gerar nova API Key com confirmação
   - Modal exibindo nova API Key (única vez)
   - URL Base da API vem de variável de ambiente

## 🚀 Como usar

### 1. Executar Migration

Execute a migration para adicionar os campos no banco de dados:

```bash
# Opção 1: Script Node.js (recomendado)
node backend/scripts/add-api-key-fields.js

# Opção 2: SQL direto (PostgreSQL)
psql -U seu_usuario -d seu_banco -f migration-add-api-key-fields.sql

# Opção 3: SQL direto (SQLite)
sqlite3 database.sqlite < migration-add-api-key-fields.sql
```

### 2. Configurar Variável de Ambiente

Adicione no arquivo `.env`:

```env
# URL Base da API (obrigatório)
API_BASE_URL=https://seu-dominio.com/api
# OU use NGROK_URL se estiver usando ngrok
NGROK_URL=https://seu-ngrok.ngrok.io/api
```

### 3. Reiniciar Backend

```bash
# Parar servidor atual e reiniciar
npm start
```

### 4. Acessar a Tela

1. Faça login como Admin Master
2. Acesse: `http://localhost:8080/admin/integrations.html`
3. A tela carregará automaticamente:
   - URL Base da API (do .env)
   - Status da API Key
   - API Key mascarada (se existir)

### 5. Gerar API Key

1. Clique em "Gerar Nova API Key"
2. Confirme a ação
3. Uma nova API Key será gerada e exibida em um modal
4. **IMPORTANTE**: Copie e guarde a chave, ela não será exibida novamente
5. Após fechar o modal, apenas a versão mascarada será exibida

## 🔐 Segurança Implementada

1. **Hash de API Keys**: Todas as API Keys são armazenadas como hash bcrypt
2. **Exibição única**: API Key completa só é exibida uma vez após geração
3. **Mascaramento**: API Keys são sempre mascaradas na interface (ex: `9f3a8f********a6d2`)
4. **Isolamento por empresa**: Cada empresa tem sua própria API Key
5. **Autenticação obrigatória**: Todas as rotas requerem JWT e role admin_master

## 📡 Como usar a API Key

### Exemplo de Requisição

```bash
# Criar agendamento via n8n
curl -X POST https://seu-dominio.com/api/n8n/appointments \
  -H "x-api-key: sua-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": 123,
    "customer_name": "João Silva",
    "appointment_date": "2024-02-15",
    "appointment_time": "14:00"
  }'
```

### Headers Aceitos

- `x-api-key: <sua-chave>` (recomendado)
- `Authorization: Bearer <sua-chave>` (alternativo)

## 🗄️ Estrutura do Banco de Dados

```sql
-- Campos adicionados na tabela users
api_key_hash VARCHAR(255) NULL
api_key_created_at TIMESTAMP NULL
api_key_last_regenerated TIMESTAMP NULL

-- Índice para performance
CREATE INDEX idx_users_api_key_hash ON users(api_key_hash) 
WHERE api_key_hash IS NOT NULL;
```

## 🔄 Fluxo de Geração de API Key

1. Admin Master clica em "Gerar Nova API Key"
2. Sistema gera chave aleatória (32 caracteres hex)
3. Chave é hasheada com bcrypt (salt 12)
4. Hash é salvo no banco de dados
5. Chave original é retornada apenas uma vez no modal
6. Após fechar modal, apenas versão mascarada é exibida

## ⚠️ Importante

- **API Key antiga é invalidada** quando uma nova é gerada
- Todas as integrações que usam a API Key antiga precisarão ser atualizadas
- A API Key completa **nunca** é armazenada em texto plano
- Apenas Admin Master pode gerar/visualizar API Keys

## 🐛 Troubleshooting

### Erro: "Coluna não existe"
- Execute a migration: `node backend/scripts/add-api-key-fields.js`

### Erro: "API Base URL não configurada"
- Adicione `API_BASE_URL` ou `NGROK_URL` no arquivo `.env`

### API Key não funciona
- Verifique se está usando a chave correta (não a mascarada)
- Verifique se a empresa tem API Key configurada
- Verifique logs do backend para erros de autenticação

## 📝 Arquivos Modificados/Criados

### Backend
- `backend/src/models/User.js` - Adicionados campos de API Key
- `backend/src/controllers/adminIntegrationController.js` - Novo controller
- `backend/src/routes/adminIntegrationRoutes.js` - Novas rotas
- `backend/src/middleware/apiKeyAuth.js` - Atualizado para multi-tenant
- `backend/server.js` - Adicionada rota `/api/admin/integrations`

### Frontend
- `frontend/admin/integrations.html` - Totalmente reescrito (dinâmico)

### Migrations
- `migration-add-api-key-fields.sql` - SQL migration
- `backend/scripts/add-api-key-fields.js` - Script Node.js migration

## ✅ Checklist de Implementação

- [x] Modelo User atualizado com campos de API Key
- [x] Migration criada e testada
- [x] Controller AdminIntegrationController criado
- [x] Rotas protegidas criadas
- [x] Middleware apiKeyAuth atualizado para multi-tenant
- [x] Frontend totalmente dinâmico
- [x] Segurança implementada (hash, mascaramento)
- [x] URL Base da API configurável via .env
- [x] Documentação completa

---

**🎉 Sistema de Integrações Dinâmicas implementado com sucesso!**

