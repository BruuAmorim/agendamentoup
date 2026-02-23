# 🔐 Sistema Profissional de API Key por Empresa - Aevum

## ✅ Implementação Completa

Sistema SaaS seguro de API Key implementado seguindo melhores práticas de segurança.

---

## 🏗️ Arquitetura Implementada

### **Estrutura de Arquivos**

```
backend/src/
├── services/
│   └── apiKeyService.js          # Serviço centralizado de API Keys
├── middleware/
│   └── apiKey.middleware.js      # Middleware profissional de validação
├── controllers/
│   ├── userController.js         # Geração automática ao criar empresa
│   └── adminIntegrationController.js  # Regeneração via painel
└── routes/
    ├── adminIntegrationRoutes.js # Rotas administrativas
    └── publicAppointmentsRoutes.js    # Rotas públicas com API Key
```

---

## 🔐 Segurança Implementada

### **1. Geração de API Key**

- **Tamanho**: 32 bytes = 64 caracteres hexadecimais
- **Método**: `crypto.randomBytes(32).toString("hex")`
- **Armazenamento**: Apenas hash bcrypt (salt rounds: 10)
- **Nunca salva em texto puro**

### **2. Validação**

- Middleware profissional `apiKey.middleware.js`
- Busca empresa pelo hash da chave
- Extrai automaticamente `empresa_id`
- Isolamento total multi-tenant

### **3. Exibição**

- API Key completa exibida **apenas uma vez** após geração
- Sempre mascarada na interface (ex: `9f3a8f********a6d2`)
- Nunca retornada novamente após primeira exibição

---

## 🚀 Funcionalidades

### **1. Geração Automática**

✅ **Ao criar empresa/moderator:**
- API Key gerada automaticamente
- Hash salvo no banco
- Chave **não** retornada na resposta de criação

**Código:**
```javascript
// backend/src/controllers/userController.js
if (userRole === 'moderator' || userRole === 'empresa') {
  await ApiKeyService.generateAndSaveApiKey(newUser.id);
}
```

### **2. Regeneração via Painel**

✅ **Rota:** `POST /api/admin/regenerate-api-key`

**Características:**
- Protegida por JWT + role admin_master
- Usa `req.user.id` para identificar empresa
- Gera nova chave (64 caracteres)
- Invalida chave anterior
- Retorna chave apenas uma vez

**Resposta:**
```json
{
  "success": true,
  "apiKey": "a1b2c3d4e5f6...64caracteres",
  "data": {
    "api_key": "a1b2c3d4e5f6...",
    "api_base_url": "https://...",
    "created_at": "2024-02-11T...",
    "last_regenerated_at": "2024-02-11T..."
  }
}
```

### **3. Middleware de Validação**

✅ **Arquivo:** `backend/src/middleware/apiKey.middleware.js`

**Uso:**
```javascript
const apiKeyMiddleware = require('../middleware/apiKey.middleware');

router.post('/appointments', apiKeyMiddleware, controller.create);
```

**Comportamento:**
- Lê header `x-api-key`
- Busca empresa pelo hash
- Adiciona `req.empresa_id` automaticamente
- Permite rotas públicas sem JWT

### **4. Rotas Públicas**

✅ **Rota:** `POST /api/public/appointments`

**Características:**
- Não requer JWT
- Requer apenas API Key no header
- Extrai `empresa_id` automaticamente
- Isolamento total por empresa

**Exemplo de uso:**
```bash
curl -X POST https://api.exemplo.com/api/public/appointments \
  -H "x-api-key: sua-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva",
    "appointment_date": "2024-02-15",
    "appointment_time": "14:00"
  }'
```

---

## 📊 Banco de Dados

### **Campos na tabela `users`:**

```sql
api_key_hash VARCHAR(255) NULL          -- Hash bcrypt da API Key
api_key_created_at TIMESTAMP NULL      -- Data de criação
api_key_last_regenerated TIMESTAMP NULL -- Data da última regeneração
```

### **Migration:**

Execute: `node backend/scripts/add-api-key-fields.js`

Ou SQL direto:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS api_key_last_regenerated TIMESTAMP NULL;
```

---

## 🎛️ Frontend (Painel Admin)

### **Página:** `/admin/integrations.html`

**Funcionalidades:**
- ✅ Status da API Key (Configurada/Não configurada)
- ✅ Campo mascarado da API Key
- ✅ Botão "🔁 Regenerar API Key"
- ✅ Modal exibindo nova chave (única vez)
- ✅ Aviso: "Copie agora. Esta chave não será exibida novamente."

**Fluxo:**
1. Admin acessa `/admin/integrations.html`
2. Sistema carrega status automaticamente
3. Se não configurada, mostra "Não configurada"
4. Se configurada, mostra versão mascarada
5. Ao clicar em "Regenerar":
   - Confirma ação
   - Chama `POST /api/admin/regenerate-api-key`
   - Exibe modal com chave completa
   - Após fechar, nunca mais exibe completa

---

## 🔄 Fluxo Completo

### **1. Criação de Empresa**

```
Admin cria empresa → UserController.createUser()
  ↓
Role = moderator/empresa?
  ↓ SIM
ApiKeyService.generateAndSaveApiKey()
  ↓
Hash salvo no banco
  ↓
Usuário criado (sem retornar API Key)
```

### **2. Regeneração**

```
Admin clica "Regenerar" → Frontend chama POST /api/admin/regenerate-api-key
  ↓
Backend valida JWT + role admin_master
  ↓
ApiKeyService.regenerateApiKey()
  ↓
Nova chave gerada (64 caracteres)
  ↓
Hash atualizado no banco
  ↓
Chave retornada apenas uma vez
  ↓
Modal exibe chave
  ↓
Após fechar, nunca mais exibida
```

### **3. Uso da API Key**

```
n8n envia requisição → Header: x-api-key: CHAVE
  ↓
apiKeyMiddleware valida
  ↓
Busca empresa pelo hash
  ↓
Adiciona req.empresa_id
  ↓
Controller usa req.empresa_id
  ↓
Isolamento total garantido
```

---

## 📝 Exemplos de Uso

### **Criar Agendamento via API Key**

```bash
POST /api/public/appointments
Headers:
  x-api-key: a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890
Body:
{
  "customer_name": "João Silva",
  "appointment_date": "2024-02-15",
  "appointment_time": "14:00",
  "customer_phone": "(11) 99999-9999"
}
```

### **Regenerar API Key**

```bash
POST /api/admin/regenerate-api-key
Headers:
  Authorization: Bearer JWT_TOKEN
Response:
{
  "success": true,
  "apiKey": "NOVA_CHAVE_64_CARACTERES",
  "data": {
    "api_key": "NOVA_CHAVE_64_CARACTERES",
    "api_base_url": "https://...",
    ...
  }
}
```

---

## ✅ Checklist de Implementação

- [x] Serviço ApiKeyService criado
- [x] Geração automática ao criar empresa
- [x] Middleware profissional de validação
- [x] Rota de regeneração protegida
- [x] Rotas públicas com API Key
- [x] Frontend com status e regeneração
- [x] Mascaramento de API Keys
- [x] Exibição única após geração
- [x] Isolamento multi-tenant garantido
- [x] Seed service atualizado

---

## 🔒 Segurança Garantida

1. ✅ API Keys nunca em texto puro no banco
2. ✅ Hash bcrypt com salt rounds 10
3. ✅ Exibição única após geração
4. ✅ Mascaramento sempre aplicado
5. ✅ Isolamento total por empresa
6. ✅ Validação profissional no middleware
7. ✅ Logs de debug para troubleshooting

---

**🎉 Sistema profissional de API Key implementado com sucesso!**






