# 🏗️ Configuração do Perfil Moderador - EvAgendamento

## 📋 Visão Geral das Mudanças

Este documento explica como configurar e usar o novo perfil **MODERADOR** implementado no sistema EvAgendamento.

## 🔄 Mudanças Implementadas

### 1. **Refatoração de Protocolos**
- **Antes:** `20260128-BRKZ` (longo e complexo)
- **Agora:** `AG-X9Y2` (curto, amigável, 6-8 caracteres)
- **Segurança:** Verificação automática de unicidade

### 2. **Novo Perfil: Moderador**
- Criado perfil `MODERATOR` no sistema
- Acesso a configurações de personalização
- Dashboard com métricas rápidas
- Gestão de empresa e serviços

### 3. **Banco de Dados**
- Nova tabela: `moderator_settings`
- Nova coluna: `service_type` em `appointments`
- Índices otimizados para performance

### 4. **Interface do Moderador**
- Botão flutuante ⚙️ (engrenagem) para moderadores
- Modal de gestão com:
  - Dashboard rápido (agendamentos hoje, serviço top)
  - Configuração de nome da empresa
  - Gestão de serviços disponíveis

### 5. **Interface do Cliente**
- Título da página atualizado com nome da empresa
- Dropdown de serviços no formulário de agendamento
- Protocolo curto exibido no modal de sucesso

---

## 🛠️ Configuração Técnica

### **Passo 1: Executar Migrações no Banco**

Execute estes comandos SQL no PostgreSQL:

```sql
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
```

### **Passo 2: Atualizar Modelo de Usuário**

O modelo User já foi atualizado para suportar o role `MODERATOR`:

```javascript
role: {
  type: DataTypes.ENUM('admin_master', 'moderator', 'user'),
  allowNull: false,
  defaultValue: 'user',
}
```

### **Passo 3: Criar Usuário Moderador**

1. **Acesse o painel Admin:** `http://localhost:8080/admin/dashboard`
2. **Vá para Gerenciar Usuários:** `http://localhost:8080/admin/users.html`
3. **Clique em "Novo Usuário"**
4. **Selecione o perfil "Moderador"** no dropdown
5. **Preencha os dados e salve**

---

## 🎯 Como Usar

### **Para Moderadores:**

1. **Login:** Use as credenciais do usuário moderador
2. **Botão de Configurações:** Aparece automaticamente no canto inferior direito
3. **Dashboard Rápido:** Veja estatísticas do dia atual
4. **Configurar Empresa:**
   - Defina o nome da empresa
   - Adicione/remova serviços disponíveis
5. **Salve as configurações**

### **Para Clientes:**

1. **O título da página** mostrará o nome da empresa (se configurado)
2. **No formulário de agendamento:**
   - Selecione o serviço desejado no dropdown
   - Preencha os outros campos normalmente
3. **Protocolo curto** será exibido na confirmação

---

## 🔧 Arquivos Modificados/Criados

### **Backend:**
- ✅ `backend/src/models/Appointment.js` - Protocolo refatorado
- ✅ `backend/src/models/User.js` - Role MODERATOR adicionada
- ✅ `backend/src/controllers/moderatorController.js` - **NOVO**
- ✅ `backend/src/routes/moderator.js` - **NOVO**
- ✅ `server.js` - Rotas do moderador adicionadas

### **Frontend:**
- ✅ `frontend/admin/users.html` - Opção MODERATOR adicionada
- ✅ `frontend/app/agendamentos.html` - Dropdown de serviços
- ✅ `frontend/js/app.js` - Lógica do moderador implementada

### **Database:**
- ✅ `migration-moderator-features.sql` - **NOVO** (migrações)

---

## 📊 API Endpoints do Moderador

```javascript
// Estatísticas rápidas
GET /api/moderator/stats
// Retorna: { total_today, top_service, top_service_count }

// Configurações da empresa
GET /api/moderator/settings
PUT /api/moderator/settings

// Informações públicas (para frontend cliente)
GET /api/moderator/company-info
```

---

## 🎨 Interface do Moderador

### **Botão Flutuante:**
- Aparece apenas para usuários com role `MODERATOR`
- Posicionado no canto inferior direito
- Design moderno com efeitos hover

### **Modal de Gestão:**
- **Dashboard Rápido:** Cards com estatísticas do dia
- **Configuração:** Inputs para nome da empresa e serviços
- **Gestão de Serviços:** Adicionar/remover dinamicamente

### **Responsividade:**
- Funciona perfeitamente em desktop e mobile
- Modal adaptável a diferentes tamanhos de tela

---

## 🔒 Segurança

- **Controle de Acesso:** Apenas moderadores podem acessar funcionalidades
- **Validação de Dados:** Todos os inputs são validados
- **Rate Limiting:** Proteção contra abuso de API
- **Autenticação JWT:** Todas as operações protegidas

---

## 🚀 Próximos Passos

1. **Testar a criação de moderador** via painel admin
2. **Configurar empresa e serviços** como moderador
3. **Testar agendamento** com dropdown de serviços
4. **Verificar protocolo curto** na confirmação
5. **Validar dashboard de analytics** do moderador

---

## 🐛 Troubleshooting

### **Protocolo não aparece curto:**
- Verifique se o servidor foi reiniciado após as mudanças
- Protocolos existentes permanecem antigos (apenas novos são curtos)

### **Botão moderador não aparece:**
- Verifique se o usuário tem role `MODERATOR` exatamente
- Recarregue a página após login

### **Dropdown de serviços vazio:**
- Configure serviços via botão de configurações do moderador
- Recarregue a página para atualizar o dropdown

---

**🎉 Implementação do perfil Moderador concluída com sucesso!** ✨


