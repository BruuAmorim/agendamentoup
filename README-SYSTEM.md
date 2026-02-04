# EvAgendamento - Sistema SaaS de Agendamentos

Sistema completo de agendamentos com autenticação baseada em perfis (RBAC) implementado.

## 🚀 Funcionalidades Implementadas

### ✅ Autenticação e Autorização
- **Login único** para todos os usuários
- **JWT Authentication** no backend
- **Controle de acesso baseado em roles** (RBAC)
- **Middleware de proteção de rotas**
- **Redirecionamento automático** baseado no perfil

### ✅ Perfis de Usuário
1. **Administrador Master (admin_master)**
   - Dashboard administrativo completo
   - Gerenciamento de usuários (CRUD)
   - Configurações do sistema
   - Acesso a todas as funcionalidades

2. **Usuário Comum (user)**
   - Sistema de agendamentos
   - Visualização e gestão de agendamentos pessoais
   - Sem acesso às configurações administrativas

### ✅ Estrutura do Sistema
- **Backend API** com Node.js + Express + Sequelize + SQLite
- **Frontend** com HTML/CSS/JavaScript puro
- **Layouts separados** para admin e usuário
- **Banco de dados** SQLite para desenvolvimento

## 📋 Contas de Teste

### Administrador
- **Email:** brunadevv@gmail.com
- **Senha:** admin123
- **Perfil:** admin_master

### Usuário Comum
- **Email:** usuarioteste@gmail.com
- **Senha:** Mudar@123
- **Perfil:** user

## 🛠️ Como Executar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Iniciar Backend API
```bash
# Terminal 1 - Backend API
npm start
# ou
node server.js
```
O backend rodará na porta **3000**.

### 3. Iniciar Servidor Web (Frontend)
```bash
# Terminal 2 - Servidor Web
node serve.js
```
O frontend rodará na porta **8080**.

## 🌐 Acesso ao Sistema

### URLs Principais
- **Página de Login:** http://localhost:8080/css/index.html
- **Dashboard Admin:** http://localhost:8080/admin/dashboard
- **Sistema de Agendamentos:** http://localhost:8080/app/agendamentos

### Fluxo de Uso
1. Acesse a página de login
2. Faça login com uma das contas de teste
3. Será redirecionado automaticamente baseado no perfil:
   - **Admin:** Dashboard administrativo
   - **Usuário:** Sistema de agendamentos

## 📁 Estrutura do Projeto

```
eva-agendmento/
├── server.js                 # Servidor backend principal
├── serve.js                  # Servidor web para frontend
├── backend/
│   └── src/
│       ├── config/
│       │   ├── sequelize.js  # Configuração banco de dados
│       │   └── database.js   # Funções auxiliares DB
│       ├── controllers/
│       │   ├── authController.js    # Autenticação
│       │   └── userController.js    # Gerenciamento usuários
│       ├── middleware/
│       │   └── auth.js       # Middleware JWT e RBAC
│       ├── models/
│       │   └── User.js       # Modelo de usuário
│       ├── routes/
│       │   ├── authRoutes.js # Rotas de auth
│       │   └── userRoutes.js # Rotas de usuários
│       └── services/
│           └── seedService.js # Criação usuários iniciais
├── frontend/
│   ├── index.html            # Redirecionamento para login
│   ├── css/
│   │   └── index.html        # Página de login
│   ├── admin/
│   │   ├── dashboard.html    # Dashboard administrativo
│   │   └── users.html        # Gerenciamento de usuários
│   ├── app/
│   │   └── agendamentos.html # Sistema de agendamentos
│   └── js/
│       ├── auth.js           # Sistema de autenticação frontend
│       ├── api.js            # Cliente API
│       └── app.js            # Lógica do app
└── database.sqlite          # Banco de dados SQLite
```

## 🔐 Sistema de Segurança

### Middleware de Autenticação
- **verifyToken:** Valida tokens JWT
- **requireRole:** Restringe acesso baseado em roles
- **blockRouteForRole:** Bloqueia rotas específicas

### Proteção de Rotas
- `/admin/*` - Apenas admin_master
- `/app/*` - Apenas usuários autenticados
- `/api/users/*` - Apenas admin_master

## 🗄️ Banco de Dados

### Tabelas
- **users:** Usuários do sistema
  - id, email, password, role, name, is_active, created_at, updated_at
- **appointments:** Agendamentos
  - id, customer_name, customer_phone, appointment_date, appointment_time, etc.

### Seeds Automáticos
- Cria usuários admin_master e user automaticamente na inicialização

## 🔧 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/profile` - Perfil do usuário

### Gerenciamento de Usuários (Admin Only)
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Desativar usuário
- `PATCH /api/users/:id/reactivate` - Reativar usuário

### Agendamentos
- `GET /api/appointments` - Listar agendamentos
- `POST /api/appointments` - Criar agendamento
- `PUT /api/appointments/:id` - Atualizar agendamento
- `DELETE /api/appointments/:id` - Cancelar agendamento

## 🎯 Funcionalidades por Perfil

### Admin Master
✅ **Dashboard Administrativo**
- Estatísticas do sistema
- Atividades recentes
- Ações rápidas

✅ **Gerenciamento de Usuários**
- Listar todos os usuários
- Criar novos usuários
- Editar usuários existentes
- Ativar/desativar usuários
- Filtrar e buscar usuários

✅ **Configurações do Sistema**
- Integrações (ClouddChat, n8n)
- Regras de negócio
- Configurações gerais

### Usuário Comum
✅ **Sistema de Agendamentos**
- Criar novos agendamentos
- Visualizar agendamentos por data
- Editar agendamentos existentes
- Verificar disponibilidade de horários
- Buscar agendamentos por cliente

❌ **Sem acesso:**
- Dashboard administrativo
- Gerenciamento de usuários
- Configurações do sistema

## 🚀 Próximos Passos

Para colocar em produção:

1. **Configurar PostgreSQL** ao invés de SQLite
2. **Adicionar variáveis de ambiente** (.env)
3. **Implementar HTTPS**
4. **Adicionar logs estruturados**
5. **Configurar CI/CD**
6. **Adicionar testes automatizados**
7. **Implementar rate limiting adicional**
8. **Adicionar monitoramento**

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Logs do servidor backend
2. Console do navegador (F12)
3. Arquivo `database.sqlite` para dados
4. Documentação das APIs












