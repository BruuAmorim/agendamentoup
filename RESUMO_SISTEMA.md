# 📋 Resumo do Funcionamento do Sistema - Aevum SaaS

## 🎯 Visão Geral

O **Aevum** é um sistema SaaS (Software as a Service) de agendamentos multi-tenant, desenvolvido para empresas gerenciarem seus agendamentos de forma profissional e segura. O sistema permite que múltiplas empresas utilizem a mesma plataforma de forma isolada, cada uma com suas próprias configurações, agendamentos e integrações.

---

## 🏗️ Arquitetura do Sistema

### **Stack Tecnológica**

**Backend:**
- **Node.js** + **Express.js** - Servidor API REST
- **Sequelize** - ORM para gerenciamento de banco de dados
- **PostgreSQL** (produção) / **SQLite** (desenvolvimento)
- **JWT** (JSON Web Tokens) - Autenticação
- **Bcrypt** - Hash de senhas e API Keys
- **Crypto** - Geração segura de chaves

**Frontend:**
- **HTML5** + **CSS3** + **JavaScript** (Vanilla)
- Interface responsiva e moderna
- Componentes modulares e reutilizáveis

**Segurança:**
- **Helmet.js** - Proteção de headers HTTP
- **CORS** configurado para integrações externas
- **Rate Limiting** - Proteção contra abuso
- **Middleware de autenticação** em todas as rotas protegidas

---

## 👥 Perfis de Usuário (RBAC)

O sistema utiliza **Role-Based Access Control (RBAC)** com três perfis principais:

### **1. Admin Master (`admin_master`)**
**Permissões:**
- ✅ Dashboard administrativo completo
- ✅ Gerenciamento de todas as empresas (CRUD)
- ✅ Criação de novos usuários e empresas
- ✅ Configurações globais do sistema
- ✅ Integrações administrativas (ClouddChat, n8n)
- ✅ Visualização de estatísticas globais
- ❌ **NÃO** pode gerar API Keys de empresas específicas

**Acesso:**
- `/admin/dashboard` - Dashboard administrativo
- `/admin/users` - Gerenciamento de usuários
- `/admin/integrations` - Configurações de integrações

### **2. Moderador/Empresa (`moderator` / `empresa`)**
**Permissões:**
- ✅ Gerenciamento completo da própria empresa
- ✅ Configurações personalizadas (nome, logo, serviços)
- ✅ Gestão de agendamentos da empresa
- ✅ Configuração de horários de funcionamento
- ✅ Gestão de campos do formulário de agendamento
- ✅ **Geração e regeneração de API Key própria**
- ✅ Dashboard com métricas da empresa
- ❌ Sem acesso ao painel administrativo global

**Acesso:**
- `/app/agendamentos` - Sistema de agendamentos
- `/app/settings` - Configurações da empresa
- `/app/settings` → Aba "Integrações" - Gerenciamento de API Key

### **3. Usuário Comum (`user`)**
**Permissões:**
- ✅ Visualizar agendamentos pessoais
- ✅ Criar agendamentos próprios
- ✅ Editar/cancelar próprios agendamentos
- ❌ Sem acesso a configurações administrativas
- ❌ Sem acesso ao dashboard da empresa

**Acesso:**
- `/app/agendamentos` - Sistema de agendamentos (modo limitado)

---

## 🔐 Sistema de Autenticação

### **Fluxo de Login**

1. **Usuário acessa** `/index.html` (página de login)
2. **Informa email e senha**
3. **Backend valida** credenciais no banco de dados
4. **Senha verificada** com `bcrypt.compare()`
5. **JWT gerado** com informações do usuário:
   ```javascript
   {
     id: user.id,
     email: user.email,
     role: user.role,
     name: user.name,
     empresa_id: user.empresa_id, // Para moderador/empresa
     parent_user_id: user.parent_user_id // Para usuários vinculados
   }
   ```
6. **Token armazenado** no `localStorage` do navegador
7. **Redirecionamento automático** baseado no perfil:
   - `admin_master` → `/admin/dashboard`
   - `moderator` / `empresa` → `/app/agendamentos`
   - `user` → `/app/agendamentos`

### **Proteção de Rotas**

**Middleware `verifyToken`:**
- Valida JWT em todas as requisições protegidas
- Extrai informações do usuário (`req.user`)
- Retorna 401 se token inválido/expirado

**Middleware `requireRole`:**
- Verifica se o usuário tem permissão para a rota
- Bloqueia acesso não autorizado (403)

**Exemplo:**
```javascript
router.get('/admin/users', verifyToken, requireRole(['admin_master']), controller.getAllUsers);
```

---

## 🔑 Sistema de API Keys

### **Visão Geral**

Cada empresa (`moderator` / `empresa`) possui uma **API Key única** que permite integrações externas (n8n, webhooks, etc.) sem necessidade de autenticação JWT.

### **Características de Segurança**

1. **Geração Segura:**
   - Formato: `AEVUM_<empresaId>_<64 caracteres hexadecimais>`
   - Exemplo: `AEVUM_10_a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890`
   - Gerada com `crypto.randomBytes(32).toString("hex")`

2. **Armazenamento:**
   - **NUNCA** salva em texto puro no banco
   - Apenas **hash bcrypt** (salt rounds: 10) é armazenado
   - Prefixo (`AEVUM_<empresaId>`) salvo separadamente para busca otimizada

3. **Exibição:**
   - API Key completa exibida **apenas uma vez** após geração/regeneração
   - Depois, sempre mascarada: `AEVUM_10_9f3a8f********a6d2`
   - Modal com aviso: "Copie agora. Esta chave não será exibida novamente."

### **Fluxo de Geração**

1. **Criação Automática:**
   - Quando um novo usuário com role `moderator` ou `empresa` é criado
   - API Key gerada automaticamente pelo `EmpresaApiKeyService`
   - Hash salvo no banco, chave **não** retornada na resposta

2. **Regeneração Manual:**
   - Admin da empresa acessa `/app/settings` → Aba "Integrações"
   - Clica em "Gerar Nova API Key"
   - Sistema valida permissões (apenas `moderator`/`empresa` podem regenerar própria chave)
   - Nova chave gerada, hash atualizado
   - Chave exibida uma vez no modal
   - Chave anterior invalidada automaticamente

### **Uso da API Key**

**Middleware `empresaApiKeyMiddleware`:**
- Lê header `x-api-key` da requisição
- Extrai `empresa_id` do prefixo da chave
- Busca empresa no banco usando prefixo (otimização)
- Compara hash da chave fornecida com hash armazenado
- Se válida, injeta `req.empresa_id` e `req.empresa` na requisição
- Permite acesso a rotas públicas sem JWT

**Exemplo de Requisição:**
```bash
POST /api/public/appointments
Headers:
  x-api-key: AEVUM_10_a1b2c3d4e5f6...
  Content-Type: application/json
Body:
{
  "customer_name": "João Silva",
  "appointment_date": "2024-02-15",
  "appointment_time": "14:00",
  "customer_phone": "(11) 99999-9999"
}
```

---

## 📅 Sistema de Agendamentos

### **Funcionalidades Principais**

1. **Criação de Agendamentos:**
   - Formulário dinâmico com campos configuráveis
   - Validação de horários disponíveis
   - Verificação de conflitos
   - Geração automática de protocolo único (ex: `AG-X9Y2`)

2. **Visualização:**
   - Calendário mensal
   - Lista por data
   - Busca por cliente/protocolo
   - Filtros por status

3. **Gestão:**
   - Edição de agendamentos
   - Cancelamento com motivo
   - Confirmação/Conclusão
   - Histórico completo

### **Validações Implementadas**

- **Horários de Funcionamento:**
  - Verifica se o horário está dentro do período configurado
  - Valida dias da semana permitidos

- **Conflitos:**
  - Verifica sobreposição de horários
  - Considera duração do serviço
  - Intervalo mínimo entre agendamentos (configurável)

- **Campos Obrigatórios:**
  - Nome do cliente (sempre obrigatório)
  - Data e hora (sempre obrigatórios)
  - Campos extras configuráveis pela empresa

---

## ⚙️ Configurações da Empresa

### **Aba "Geral"**
- Nome da empresa
- Logo (upload de imagem)
- Configurações básicas

### **Aba "Formulário"**
- Campos visíveis no formulário de agendamento
- Campos extras personalizados
- Validações customizadas

### **Aba "Serviços"**
- Lista de serviços oferecidos
- Adicionar/remover serviços
- Serviços exibidos em dropdown no formulário

### **Aba "Horários"**
- Horário de início e fim
- Dias da semana de funcionamento
- Intervalo entre agendamentos (slot_interval)

### **Aba "Integrações"**
- Status da API Key (Configurada/Não configurada)
- Prefixo da API Key (mascarado)
- Datas de criação/regeneração
- Botão para regenerar API Key
- **Proteção:** Requer verificação de senha para acessar

---

## 🗄️ Estrutura do Banco de Dados

### **Tabela `users`**
```sql
- id (SERIAL PRIMARY KEY)
- email (VARCHAR, UNIQUE, NOT NULL)
- password (VARCHAR, NOT NULL) -- Hash bcrypt
- role (VARCHAR) -- 'admin_master', 'moderator', 'user'
- name (VARCHAR, NOT NULL)
- is_active (BOOLEAN, DEFAULT TRUE)
- parent_user_id (INTEGER, NULL) -- Para usuários vinculados a empresa
- api_key_hash (VARCHAR, NULL) -- Hash da API Key
- api_key_prefix (VARCHAR, NULL) -- Prefixo para busca otimizada
- api_key_created_at (TIMESTAMP, NULL)
- api_key_last_regenerated (TIMESTAMP, NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### **Tabela `appointments`**
```sql
- id (UUID PRIMARY KEY)
- protocol (VARCHAR, UNIQUE, NOT NULL) -- Ex: AG-X9Y2
- user_id (INTEGER, REFERENCES users.id)
- customer_name (VARCHAR, NOT NULL)
- customer_email (VARCHAR)
- customer_phone (VARCHAR)
- customer_cpf (VARCHAR)
- service_type (VARCHAR) -- Serviço selecionado
- appointment_date (DATE, NOT NULL)
- appointment_time (TIME, NOT NULL)
- duration_minutes (INTEGER, DEFAULT 60)
- notes (TEXT)
- extra_fields (JSONB) -- Campos extras personalizados
- status (VARCHAR) -- 'pending', 'confirmed', 'cancelled', 'completed'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- cancelled_at (TIMESTAMP, NULL)
- cancellation_reason (TEXT, NULL)
```

### **Tabela `moderator_settings`**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER, UNIQUE, REFERENCES users.id)
- company_name (VARCHAR)
- services (JSONB) -- Array de serviços
- working_hours (JSONB) -- { start: '09:00', end: '18:00' }
- working_days (JSONB) -- ['monday', 'tuesday', ...]
- campos_visiveis (JSONB) -- Campos do formulário
- campos_extras (JSONB) -- Campos extras personalizados
- logo (TEXT) -- Base64 da imagem
- slot_interval (INTEGER, DEFAULT 30) -- Minutos entre slots
- employee_limit (INTEGER, DEFAULT 10)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🔄 Fluxos Principais

### **1. Fluxo de Criação de Empresa**

```
Admin Master cria empresa
  ↓
POST /api/users { role: 'moderator', ... }
  ↓
UserController.createUser()
  ↓
Senha hasheada com bcrypt
  ↓
Usuário salvo no banco
  ↓
Se role = 'moderator' ou 'empresa':
  EmpresaApiKeyService.regenerateApiKey()
    ↓
  API Key gerada (AEVUM_<id>_<64chars>)
    ↓
  Hash bcrypt salvo no banco
    ↓
  Prefixo salvo para busca otimizada
  ↓
Resposta retornada (SEM API Key)
```

### **2. Fluxo de Agendamento via API Key**

```
Sistema externo (n8n) envia requisição
  ↓
POST /api/public/appointments
  Header: x-api-key: AEVUM_10_...
  ↓
empresaApiKeyMiddleware valida:
  - Extrai empresa_id do prefixo
  - Busca empresa no banco
  - Compara hash da chave
  ↓
Se válida:
  req.empresa_id = 10
  req.empresa = { id: 10, name: '...', ... }
  ↓
AppointmentController.create()
  ↓
Agendamento criado vinculado à empresa_id
  ↓
Resposta 201 com agendamento criado
```

### **3. Fluxo de Login e Redirecionamento**

```
Usuário acessa /index.html
  ↓
Informa email e senha
  ↓
POST /api/auth/login
  ↓
AuthController.login()
  - Valida credenciais
  - Compara senha com bcrypt
  ↓
Se válido:
  JWT gerado com dados do usuário
  ↓
Token retornado ao frontend
  ↓
Token salvo no localStorage
  ↓
Frontend verifica role:
  - admin_master → /admin/dashboard
  - moderator/empresa → /app/agendamentos
  - user → /app/agendamentos
```

---

## 🛡️ Segurança Implementada

### **1. Autenticação**
- ✅ Senhas hasheadas com bcrypt (salt rounds: 12)
- ✅ JWT com expiração (8 horas)
- ✅ Tokens validados em todas as rotas protegidas
- ✅ Refresh token implementado

### **2. API Keys**
- ✅ Nunca armazenadas em texto puro
- ✅ Hash bcrypt com salt rounds: 10
- ✅ Prefixo para busca otimizada (evita loops)
- ✅ Exibição única após geração
- ✅ Validação profissional no middleware

### **3. Proteção de Rotas**
- ✅ Middleware de autenticação em todas as rotas sensíveis
- ✅ RBAC (Role-Based Access Control)
- ✅ Bloqueio de rotas por perfil
- ✅ Rate limiting configurado

### **4. Headers de Segurança**
- ✅ Helmet.js configurado
- ✅ CORS configurado para origens permitidas
- ✅ Cache-Control para evitar cache de dados sensíveis

---

## 📡 Endpoints Principais da API

### **Autenticação**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/profile` - Perfil do usuário

### **Usuários (Admin Only)**
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Desativar usuário
- `PATCH /api/users/:id/reactivate` - Reativar usuário

### **Agendamentos**
- `GET /api/appointments` - Listar agendamentos (filtrado por empresa)
- `POST /api/appointments` - Criar agendamento (requer JWT)
- `POST /api/public/appointments` - Criar agendamento via API Key
- `PUT /api/appointments/:id` - Atualizar agendamento
- `DELETE /api/appointments/:id` - Cancelar agendamento
- `GET /api/appointments/available-slots` - Horários disponíveis

### **Configurações (Moderador/Empresa)**
- `GET /api/moderator/settings` - Obter configurações
- `PUT /api/moderator/settings` - Salvar configurações
- `POST /api/auth/verify-admin-password` - Verificar senha para edição

### **API Keys (Moderador/Empresa)**
- `GET /api/empresa/api-key/info` - Informações da API Key
- `POST /api/empresa/api-key/regenerate` - Regenerar API Key

### **Dashboard (Admin)**
- `GET /api/admin/dashboard/stats` - Estatísticas globais
- `GET /api/admin/dashboard/recent-activities` - Atividades recentes

---

## 🚀 Como Executar o Sistema

### **1. Instalação**
```bash
npm install
```

### **2. Configuração**
Criar arquivo `.env` na raiz:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=sua-chave-secreta-aqui
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
# Para PostgreSQL:
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=aevum
# DB_USER=postgres
# DB_PASSWORD=sua-senha
```

### **3. Iniciar Backend**
```bash
npm start
# ou
node backend/server.js
```
Backend rodará em `http://localhost:3000`

### **4. Iniciar Frontend**
```bash
# Opção 1: Servidor Python simples
cd frontend
python -m http.server 8080

# Opção 2: Usar arquivo batch (Windows)
start-frontend.bat
```
Frontend rodará em `http://localhost:8080`

### **5. Acessar Sistema**
- **Login:** `http://localhost:8080/index.html`
- **Dashboard Admin:** `http://localhost:8080/admin/dashboard`
- **Agendamentos:** `http://localhost:8080/app/agendamentos`

---

## 📊 Isolamento Multi-Tenant

O sistema garante **isolamento total** entre empresas:

1. **Agendamentos:**
   - Sempre filtrados por `empresa_id`
   - Usuários com `parent_user_id` veem apenas agendamentos da empresa pai

2. **Configurações:**
   - Cada empresa tem suas próprias configurações em `moderator_settings`
   - Vinculadas por `user_id` (que é o `empresa_id`)

3. **API Keys:**
   - Cada empresa possui API Key única
   - Middleware extrai `empresa_id` automaticamente
   - Agendamentos criados via API Key são vinculados à empresa correta

4. **Usuários:**
   - Usuários com `parent_user_id` pertencem à empresa pai
   - Acesso limitado aos dados da empresa vinculada

---

## 🎨 Interface do Usuário

### **Design Moderno**
- Interface limpa e profissional
- Cores: Azul primário (#0091FF), tons de cinza para textos
- Tipografia: Inter (Google Fonts)
- Componentes reutilizáveis

### **Responsividade**
- Layout adaptável para desktop e mobile
- Modais para ações importantes
- Feedback visual em todas as ações

### **Experiência do Usuário**
- Loading states em requisições
- Mensagens de erro claras
- Confirmações para ações destrutivas
- Validação em tempo real nos formulários

---

## 🔧 Manutenção e Extensibilidade

### **Estrutura Modular**
- Controllers separados por funcionalidade
- Services para lógica de negócio
- Middleware reutilizável
- Models com Sequelize

### **Logs e Debug**
- Logs detalhados no backend
- Console logs no frontend (modo desenvolvimento)
- Rastreamento de erros

### **Migrações**
- Scripts SQL para adicionar campos
- Migrações versionadas
- Compatibilidade com SQLite e PostgreSQL

---

## 📝 Conclusão

O **Aevum** é um sistema SaaS completo e profissional de agendamentos, com:

✅ **Multi-tenancy** seguro e isolado  
✅ **Autenticação** robusta com JWT e RBAC  
✅ **API Keys** para integrações externas  
✅ **Configurações** personalizáveis por empresa  
✅ **Interface** moderna e responsiva  
✅ **Segurança** em todas as camadas  
✅ **Escalabilidade** preparada para crescimento  

---

**Desenvolvido com ❤️ para facilitar o gerenciamento de agendamentos**





