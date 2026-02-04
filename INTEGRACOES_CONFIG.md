# 🔧 Configurações de Integração - EvAgendamento

Este guia explica como configurar as integrações do EvAgendamento com WhatsApp Business API e n8n para automatizar o atendimento ao cliente.

## 📋 Pré-requisitos

### **Para WhatsApp Business API:**
1. **Conta Business no Facebook**
2. **Aplicativo WhatsApp Business aprovado**
3. **Token de Acesso permanente**
4. **ID do Número de telefone**
5. **ID da Conta Business**

### **Para Cloud Chat:**
1. **Conta no Cloud Chat**
2. **API Key válida**
3. **URL base da API**
4. **ID da instância (se aplicável)**
5. **Token de webhook (opcional)**

### **Para n8n:**
1. **Instância n8n rodando**
2. **Webhook configurado**
3. **URL de acesso público**
4. **Chave API (opcional)**

---

## ⚙️ Acessando as Configurações

### **Via Interface Web:**
1. Abra `frontend/index.html`
2. Clique no botão **⚙️ (Configurações)** no canto superior direito
3. Ou acesse diretamente `frontend/configuracoes.html`

### **Funcionalidades Disponíveis:**
- ✅ **Status da API** - Verificar conectividade
- ✅ **Integrações WhatsApp** - Configurar Business API
- ✅ **Integrações n8n** - Configurar webhooks
- ✅ **Configurações Gerais** - Ajustar sistema
- ✅ **Export/Import** - Backup das configurações

---

## 📱 **1. CONFIGURANDO WHATSAPP BUSINESS API**

### **Passo 1: Obter Credenciais**

#### **Acesse o Facebook Developers:**
```
https://developers.facebook.com/
```

#### **Crie/Configure seu App:**
1. Vá para "Meus Apps" → "Criar App"
2. Escolha "Negócios" → "WhatsApp Business"
3. Configure o WhatsApp:
   - Adicione um número de telefone
   - Configure webhooks (opcional)
   - Gere token de acesso

#### **Credenciais Necessárias:**
```json
{
  "whatsappToken": "EAAXXXXX...XXXX",
  "whatsappPhoneNumberId": "1234567890123456",
  "whatsappBusinessId": "987654321098765"
}
```

### **Passo 2: Configurar no EvAgendamento**

1. **Abra as configurações** (`frontend/configuracoes.html`)
2. **Seção WhatsApp:**
   - Cole o **Token de Acesso**
   - Insira o **ID do Número**
   - Insira o **ID da Conta Business**
   - ✅ **Marque "Habilitar integração"**

3. **Teste a configuração:**
   - Clique em **"Salvar Configurações"**
   - Status deve mudar para **"Configurado"**

### **Passo 3: Usar a Integração**

#### **Envio de Mensagens:**
```javascript
// O sistema enviará automaticamente:
// - Confirmações de agendamento
// - Lembretes
// - Cancelamentos
// - Atualizações
```

#### **URLs de Webhook:**
```
POST /webhook/whatsapp/incoming
- Recebe mensagens do WhatsApp
- Processa solicitações de agendamento
- Responde automaticamente
```

---

## 💬 **2. CONFIGURANDO CLOUD CHAT**

### **Passo 1: Obter Credenciais**

#### **Acesse o Cloud Chat:**
```
https://new.clouddchat.com/
```

#### **Configure sua conta:**
1. Faça login na sua conta
2. Vá para configurações da API
3. Gere uma **API Key**
4. Anote a **URL Base da API**
5. Configure webhooks (opcional)

#### **Credenciais Necessárias:**
```json
{
  "apiKey": "ck-1234567890abcdef...",
  "baseUrl": "https://api.clouddchat.com",
  "instanceId": "inst_12345",
  "webhookToken": "wh-token-abcdef..."
}
```

### **Passo 2: Configurar no EvAgendamento**

1. **Abra as configurações** (`frontend/configuracoes.html`)
2. **Seção Cloud Chat:**
   - **API Key:** Cole sua chave de API
   - **URL Base:** `https://api.clouddchat.com`
   - **ID da Instância:** (se aplicável)
   - **Token do Webhook:** Para validar webhooks
   - ✅ **Habilitar integração**
   - ✅ **Respostas automáticas** (opcional)

3. **Teste a configuração:**
   - Clique em **"Testar API"**
   - Deve aparecer mensagem de sucesso

### **Passo 3: Funcionalidades Disponíveis**

#### **Mensagens Automáticas:**
- ✅ **Confirmação de agendamento**
- ✅ **Lembretes automáticos**
- ✅ **Cancelamentos**
- ✅ **Respostas básicas via chat**

#### **Webhooks Recebidos:**
```
POST /webhook/cloudchat/incoming
```
- Recebe mensagens dos clientes
- Processa solicitações de agendamento
- Envia respostas automáticas

#### **Envio de Mensagens:**
```
POST /webhook/cloudchat/send
```
```json
{
  "to": "+5511999999999",
  "message": "Seu agendamento foi confirmado!",
  "chat_id": "chat_123"
}
```

### **Passo 4: Testes da Integração**

#### **Teste via API:**
```bash
# Enviar mensagem de teste
curl -X POST http://localhost:3000/webhook/cloudchat/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "message": "Olá! Teste de integração."
  }'
```

#### **Teste de Webhook:**
```bash
# Simular mensagem recebida
curl -X POST http://localhost:3000/webhook/cloudchat/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quero agendar uma consulta",
    "from": "+5511999999999",
    "chat_id": "chat_123"
  }'
```

---

## ⚡ **3. CONFIGURANDO N8N**

### **Passo 1: Preparar n8n**

#### **Instalar e Configurar n8n:**
```bash
# Via Docker
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n

# Acesse: http://localhost:5678
```

#### **Criar Workflow Básico:**
1. **Webhook Trigger:**
   - URL: `http://seuservidor.com/webhook/evagendamento`
   - Method: POST
   - Authentication: None ou API Key

2. **Processar Dados:**
   - Extrair informações da mensagem
   - Chamar API do EvAgendamento
   - Enviar resposta

### **Passo 2: Configurar Webhook no EvAgendamento**

1. **Abra as configurações** (`frontend/configuracoes.html`)
2. **Seção n8n:**
   - **URL do Webhook:** `https://seuservidor.com/webhook/evagendamento`
   - **Chave API:** (se necessário)
   - ✅ **Marque "Habilitar integração"**

3. **Teste a configuração:**
   - Clique em **"Testar Webhook"**
   - Deve aparecer mensagem de sucesso

### **Passo 3: Workflow de Exemplo**

#### **Workflow Básico - Processamento de Agendamento:**
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "evagendamento",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Process Message",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": `
          // Extrair dados da mensagem
          const message = $node["Webhook"].json["message"];
          const phone = $node["Webhook"].json["phone"];

          // Usar IA para processar
          const extracted = await processWithAI(message);

          return {
            customer_name: extracted.name,
            customer_phone: phone,
            appointment_date: extracted.date,
            appointment_time: extracted.time
          };
        `
      }
    },
    {
      "name": "Create Appointment",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/appointments",
        "method": "POST",
        "bodyContentType": "json",
        "body": "={{ $node[\"Process Message\"].json }}"
      }
    },
    {
      "name": "Send Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "={{ { success: true, message: 'Agendamento criado!', data: $node[\"Create Appointment\"].json } }}"
      }
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Process Message", "type": "main", "index": 0 }]] },
    "Process Message": { "main": [[{ "node": "Create Appointment", "type": "main", "index": 0 }]] },
    "Create Appointment": { "main": [[{ "node": "Send Response", "type": "main", "index": 0 }]] }
  }
}
```

---

## 🔄 **3. TESTANDO AS INTEGRAÇÕES**

### **Teste WhatsApp:**

#### **Via API:**
```bash
curl -X POST http://localhost:3000/webhook/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, gostaria de agendar uma consulta para amanhã às 14h",
    "phone": "(11) 99999-9999"
  }'
```

#### **Via Interface:**
1. Configure WhatsApp nas configurações
2. Envie uma mensagem de teste
3. Verifique logs do servidor

### **Teste n8n:**

#### **Via API:**
```bash
curl -X POST https://seuservidor.com/webhook/evagendamento \
  -H "Content-Type: application/json" \
  -d '{
    "event": "new_message",
    "message": "Quero marcar uma consulta",
    "phone": "(11) 99999-9999"
  }'
```

#### **Via Interface:**
1. Configure n8n nas configurações
2. Clique em "Testar Webhook"
3. Verifique resposta no n8n

---

## 📊 **4. MONITORAMENTO**

### **Logs de Integração:**

#### **WhatsApp:**
```bash
# Verificar logs de mensagens enviadas
tail -f logs/whatsapp.log

# Exemplo de log:
[2024-01-21 15:30:00] 📱 Enviando mensagem para (11) 99999-9999
[2024-01-21 15:30:01] ✅ Mensagem enviada: ID 123456789
```

#### **n8n:**
```bash
# Verificar webhooks recebidos
tail -f logs/n8n.log

# Exemplo de log:
[2024-01-21 15:35:00] ⚡ Webhook n8n: new_appointment_request
[2024-01-21 15:35:01] ✅ Agendamento criado via n8n: ID 789
```

### **Status das Integrações:**

#### **Via Interface:**
- Abra `frontend/configuracoes.html`
- Veja status em tempo real
- Clique em "Testar Conexão"

#### **Via API:**
```bash
# Status geral das integrações
curl http://localhost:3000/api/integrations/status

# Resposta esperada:
{
  "whatsapp": {
    "enabled": true,
    "configured": true,
    "status": "online"
  },
  "n8n": {
    "enabled": true,
    "configured": true,
    "last_webhook": "2024-01-21T15:30:00Z"
  }
}
```

---

## 🔧 **5. CONFIGURAÇÕES AVANÇADAS**

### **Configurações de Sistema:**

```json
{
  "systemTitle": "EvAgendamento",
  "defaultDuration": 60,
  "businessHoursStart": "08:00",
  "businessHoursEnd": "18:00",
  "timezone": "America/Sao_Paulo",
  "language": "pt-BR"
}
```

### **Configurações de WhatsApp:**

```json
{
  "whatsapp": {
    "enabled": true,
    "token": "EAAXXXXX...XXXX",
    "phoneNumberId": "1234567890123456",
    "businessId": "987654321098765",
    "webhookVerifyToken": "meu_token_secreto",
    "autoReplyEnabled": true,
    "workingHoursOnly": true
  }
}
```

### **Configurações de n8n:**

```json
{
  "n8n": {
    "enabled": true,
    "webhookUrl": "https://n8n.exemplo.com/webhook/evagendamento",
    "apiKey": "sk-1234567890abcdef",
    "timeout": 30000,
    "retryAttempts": 3,
    "processAsync": true
  }
}
```

---

## 🚨 **6. TROUBLESHOOTING**

### **WhatsApp - Token Expirado:**
```
Erro: "Invalid access token"
Solução: Gere novo token no Facebook Developers
```

### **n8n - Webhook Não Responde:**
```
Erro: "Failed to fetch"
Solução:
- Verifique se n8n está rodando
- Confirme URL do webhook
- Teste conectividade: curl https://seuservidor.com/webhook
```

### **Configurações Não Salvam:**
```
Sintoma: Configurações desaparecem ao recarregar
Solução:
- Verifique localStorage do navegador
- Tente limpar cache
- Use "Exportar Config" para backup
```

### **Integração Não Funciona:**
```
Passos de debug:
1. Verifique status na página de configurações
2. Teste conexão individualmente
3. Verifique logs do servidor
4. Teste manualmente via curl
5. Verifique configurações de CORS/firewall
```

---

## 📚 **7. RECURSOS ADICIONAIS**

### **Documentação Oficial:**
- **WhatsApp Business API:** https://developers.facebook.com/docs/whatsapp/
- **n8n Documentation:** https://docs.n8n.io/

### **Exemplos Práticos:**
- **`INTEGRACAO_N8N.md`** - Workflows detalhados
- **`TESTE_COMPLETO.md`** - Cenários de teste
- **`TROUBLESHOOTING.md`** - Solução de problemas

### **Comunidade:**
- **n8n Community:** https://community.n8n.io/
- **WhatsApp Developers:** https://developers.facebook.com/community/whatsapp/

---

## 🎯 **CHECKLIST DE CONFIGURAÇÃO**

### **Cloud Chat ✅**
- [ ] Conta no Cloud Chat criada
- [ ] API Key gerada
- [ ] URL base da API configurada
- [ ] ID da instância (se aplicável)
- [ ] Token do webhook configurado
- [ ] Credenciais inseridas no EvAgendamento
- [ ] Integração testada com sucesso

### **WhatsApp ✅**
- [ ] Conta Business criada
- [ ] Aplicativo WhatsApp configurado
- [ ] Token de acesso gerado
- [ ] Número de telefone adicionado
- [ ] Webhook configurado (opcional)
- [ ] Credenciais inseridas no EvAgendamento
- [ ] Integração testada com sucesso

### **n8n ✅**
- [ ] n8n instalado e rodando
- [ ] Workflow criado
- [ ] Webhook URL configurada
- [ ] Autenticação configurada (se necessário)
- [ ] URL inserida no EvAgendamento
- [ ] Teste de webhook realizado

### **Sistema ✅**
- [ ] Configurações salvas
- [ ] Status das integrações verde
- [ ] Testes de conectividade OK
- [ ] Logs funcionando
- [ ] Backup das configurações feito

---

**🚀 Com essas configurações, seu EvAgendamento estará totalmente integrado e automatizado!** 🎉✨

Este guia explica como configurar as integrações do EvAgendamento com WhatsApp Business API e n8n para automatizar o atendimento ao cliente.

## 📋 Pré-requisitos

### **Para WhatsApp Business API:**
1. **Conta Business no Facebook**
2. **Aplicativo WhatsApp Business aprovado**
3. **Token de Acesso permanente**
4. **ID do Número de telefone**
5. **ID da Conta Business**

### **Para Cloud Chat:**
1. **Conta no Cloud Chat**
2. **API Key válida**
3. **URL base da API**
4. **ID da instância (se aplicável)**
5. **Token de webhook (opcional)**

### **Para n8n:**
1. **Instância n8n rodando**
2. **Webhook configurado**
3. **URL de acesso público**
4. **Chave API (opcional)**

---

## ⚙️ Acessando as Configurações

### **Via Interface Web:**
1. Abra `frontend/index.html`
2. Clique no botão **⚙️ (Configurações)** no canto superior direito
3. Ou acesse diretamente `frontend/configuracoes.html`

### **Funcionalidades Disponíveis:**
- ✅ **Status da API** - Verificar conectividade
- ✅ **Integrações WhatsApp** - Configurar Business API
- ✅ **Integrações n8n** - Configurar webhooks
- ✅ **Configurações Gerais** - Ajustar sistema
- ✅ **Export/Import** - Backup das configurações

---

## 📱 **1. CONFIGURANDO WHATSAPP BUSINESS API**

### **Passo 1: Obter Credenciais**

#### **Acesse o Facebook Developers:**
```
https://developers.facebook.com/
```

#### **Crie/Configure seu App:**
1. Vá para "Meus Apps" → "Criar App"
2. Escolha "Negócios" → "WhatsApp Business"
3. Configure o WhatsApp:
   - Adicione um número de telefone
   - Configure webhooks (opcional)
   - Gere token de acesso

#### **Credenciais Necessárias:**
```json
{
  "whatsappToken": "EAAXXXXX...XXXX",
  "whatsappPhoneNumberId": "1234567890123456",
  "whatsappBusinessId": "987654321098765"
}
```

### **Passo 2: Configurar no EvAgendamento**

1. **Abra as configurações** (`frontend/configuracoes.html`)
2. **Seção WhatsApp:**
   - Cole o **Token de Acesso**
   - Insira o **ID do Número**
   - Insira o **ID da Conta Business**
   - ✅ **Marque "Habilitar integração"**

3. **Teste a configuração:**
   - Clique em **"Salvar Configurações"**
   - Status deve mudar para **"Configurado"**

### **Passo 3: Usar a Integração**

#### **Envio de Mensagens:**
```javascript
// O sistema enviará automaticamente:
// - Confirmações de agendamento
// - Lembretes
// - Cancelamentos
// - Atualizações
```

#### **URLs de Webhook:**
```
POST /webhook/whatsapp/incoming
- Recebe mensagens do WhatsApp
- Processa solicitações de agendamento
- Responde automaticamente
```

---

## 💬 **2. CONFIGURANDO CLOUD CHAT**

### **Passo 1: Obter Credenciais**

#### **Acesse o Cloud Chat:**
```
https://new.clouddchat.com/
```

#### **Configure sua conta:**
1. Faça login na sua conta
2. Vá para configurações da API
3. Gere uma **API Key**
4. Anote a **URL Base da API**
5. Configure webhooks (opcional)

#### **Credenciais Necessárias:**
```json
{
  "apiKey": "ck-1234567890abcdef...",
  "baseUrl": "https://api.clouddchat.com",
  "instanceId": "inst_12345",
  "webhookToken": "wh-token-abcdef..."
}
```

### **Passo 2: Configurar no EvAgendamento**

1. **Abra as configurações** (`frontend/configuracoes.html`)
2. **Seção Cloud Chat:**
   - **API Key:** Cole sua chave de API
   - **URL Base:** `https://api.clouddchat.com`
   - **ID da Instância:** (se aplicável)
   - **Token do Webhook:** Para validar webhooks
   - ✅ **Habilitar integração**
   - ✅ **Respostas automáticas** (opcional)

3. **Teste a configuração:**
   - Clique em **"Testar API"**
   - Deve aparecer mensagem de sucesso

### **Passo 3: Funcionalidades Disponíveis**

#### **Mensagens Automáticas:**
- ✅ **Confirmação de agendamento**
- ✅ **Lembretes automáticos**
- ✅ **Cancelamentos**
- ✅ **Respostas básicas via chat**

#### **Webhooks Recebidos:**
```
POST /webhook/cloudchat/incoming
```
- Recebe mensagens dos clientes
- Processa solicitações de agendamento
- Envia respostas automáticas

#### **Envio de Mensagens:**
```
POST /webhook/cloudchat/send
```
```json
{
  "to": "+5511999999999",
  "message": "Seu agendamento foi confirmado!",
  "chat_id": "chat_123"
}
```

### **Passo 4: Testes da Integração**

#### **Teste via API:**
```bash
# Enviar mensagem de teste
curl -X POST http://localhost:3000/webhook/cloudchat/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "message": "Olá! Teste de integração."
  }'
```

#### **Teste de Webhook:**
```bash
# Simular mensagem recebida
curl -X POST http://localhost:3000/webhook/cloudchat/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quero agendar uma consulta",
    "from": "+5511999999999",
    "chat_id": "chat_123"
  }'
```

---

## ⚡ **3. CONFIGURANDO N8N**

### **Passo 1: Preparar n8n**

#### **Instalar e Configurar n8n:**
```bash
# Via Docker
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n

# Acesse: http://localhost:5678
```

#### **Criar Workflow Básico:**
1. **Webhook Trigger:**
   - URL: `http://seuservidor.com/webhook/evagendamento`
   - Method: POST
   - Authentication: None ou API Key

2. **Processar Dados:**
   - Extrair informações da mensagem
   - Chamar API do EvAgendamento
   - Enviar resposta

### **Passo 2: Configurar Webhook no EvAgendamento**

1. **Abra as configurações** (`frontend/configuracoes.html`)
2. **Seção n8n:**
   - **URL do Webhook:** `https://seuservidor.com/webhook/evagendamento`
   - **Chave API:** (se necessário)
   - ✅ **Marque "Habilitar integração"**

3. **Teste a configuração:**
   - Clique em **"Testar Webhook"**
   - Deve aparecer mensagem de sucesso

### **Passo 3: Workflow de Exemplo**

#### **Workflow Básico - Processamento de Agendamento:**
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "evagendamento",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Process Message",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": `
          // Extrair dados da mensagem
          const message = $node["Webhook"].json["message"];
          const phone = $node["Webhook"].json["phone"];

          // Usar IA para processar
          const extracted = await processWithAI(message);

          return {
            customer_name: extracted.name,
            customer_phone: phone,
            appointment_date: extracted.date,
            appointment_time: extracted.time
          };
        `
      }
    },
    {
      "name": "Create Appointment",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/appointments",
        "method": "POST",
        "bodyContentType": "json",
        "body": "={{ $node[\"Process Message\"].json }}"
      }
    },
    {
      "name": "Send Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "={{ { success: true, message: 'Agendamento criado!', data: $node[\"Create Appointment\"].json } }}"
      }
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Process Message", "type": "main", "index": 0 }]] },
    "Process Message": { "main": [[{ "node": "Create Appointment", "type": "main", "index": 0 }]] },
    "Create Appointment": { "main": [[{ "node": "Send Response", "type": "main", "index": 0 }]] }
  }
}
```

---

## 🔄 **3. TESTANDO AS INTEGRAÇÕES**

### **Teste WhatsApp:**

#### **Via API:**
```bash
curl -X POST http://localhost:3000/webhook/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, gostaria de agendar uma consulta para amanhã às 14h",
    "phone": "(11) 99999-9999"
  }'
```

#### **Via Interface:**
1. Configure WhatsApp nas configurações
2. Envie uma mensagem de teste
3. Verifique logs do servidor

### **Teste n8n:**

#### **Via API:**
```bash
curl -X POST https://seuservidor.com/webhook/evagendamento \
  -H "Content-Type: application/json" \
  -d '{
    "event": "new_message",
    "message": "Quero marcar uma consulta",
    "phone": "(11) 99999-9999"
  }'
```

#### **Via Interface:**
1. Configure n8n nas configurações
2. Clique em "Testar Webhook"
3. Verifique resposta no n8n

---

## 📊 **4. MONITORAMENTO**

### **Logs de Integração:**

#### **WhatsApp:**
```bash
# Verificar logs de mensagens enviadas
tail -f logs/whatsapp.log

# Exemplo de log:
[2024-01-21 15:30:00] 📱 Enviando mensagem para (11) 99999-9999
[2024-01-21 15:30:01] ✅ Mensagem enviada: ID 123456789
```

#### **n8n:**
```bash
# Verificar webhooks recebidos
tail -f logs/n8n.log

# Exemplo de log:
[2024-01-21 15:35:00] ⚡ Webhook n8n: new_appointment_request
[2024-01-21 15:35:01] ✅ Agendamento criado via n8n: ID 789
```

### **Status das Integrações:**

#### **Via Interface:**
- Abra `frontend/configuracoes.html`
- Veja status em tempo real
- Clique em "Testar Conexão"

#### **Via API:**
```bash
# Status geral das integrações
curl http://localhost:3000/api/integrations/status

# Resposta esperada:
{
  "whatsapp": {
    "enabled": true,
    "configured": true,
    "status": "online"
  },
  "n8n": {
    "enabled": true,
    "configured": true,
    "last_webhook": "2024-01-21T15:30:00Z"
  }
}
```

---

## 🔧 **5. CONFIGURAÇÕES AVANÇADAS**

### **Configurações de Sistema:**

```json
{
  "systemTitle": "EvAgendamento",
  "defaultDuration": 60,
  "businessHoursStart": "08:00",
  "businessHoursEnd": "18:00",
  "timezone": "America/Sao_Paulo",
  "language": "pt-BR"
}
```

### **Configurações de WhatsApp:**

```json
{
  "whatsapp": {
    "enabled": true,
    "token": "EAAXXXXX...XXXX",
    "phoneNumberId": "1234567890123456",
    "businessId": "987654321098765",
    "webhookVerifyToken": "meu_token_secreto",
    "autoReplyEnabled": true,
    "workingHoursOnly": true
  }
}
```

### **Configurações de n8n:**

```json
{
  "n8n": {
    "enabled": true,
    "webhookUrl": "https://n8n.exemplo.com/webhook/evagendamento",
    "apiKey": "sk-1234567890abcdef",
    "timeout": 30000,
    "retryAttempts": 3,
    "processAsync": true
  }
}
```

---

## 🚨 **6. TROUBLESHOOTING**

### **WhatsApp - Token Expirado:**
```
Erro: "Invalid access token"
Solução: Gere novo token no Facebook Developers
```

### **n8n - Webhook Não Responde:**
```
Erro: "Failed to fetch"
Solução:
- Verifique se n8n está rodando
- Confirme URL do webhook
- Teste conectividade: curl https://seuservidor.com/webhook
```

### **Configurações Não Salvam:**
```
Sintoma: Configurações desaparecem ao recarregar
Solução:
- Verifique localStorage do navegador
- Tente limpar cache
- Use "Exportar Config" para backup
```

### **Integração Não Funciona:**
```
Passos de debug:
1. Verifique status na página de configurações
2. Teste conexão individualmente
3. Verifique logs do servidor
4. Teste manualmente via curl
5. Verifique configurações de CORS/firewall
```

---

## 📚 **7. RECURSOS ADICIONAIS**

### **Documentação Oficial:**
- **WhatsApp Business API:** https://developers.facebook.com/docs/whatsapp/
- **n8n Documentation:** https://docs.n8n.io/

### **Exemplos Práticos:**
- **`INTEGRACAO_N8N.md`** - Workflows detalhados
- **`TESTE_COMPLETO.md`** - Cenários de teste
- **`TROUBLESHOOTING.md`** - Solução de problemas

### **Comunidade:**
- **n8n Community:** https://community.n8n.io/
- **WhatsApp Developers:** https://developers.facebook.com/community/whatsapp/

---

## 🎯 **CHECKLIST DE CONFIGURAÇÃO**

### **Cloud Chat ✅**
- [ ] Conta no Cloud Chat criada
- [ ] API Key gerada
- [ ] URL base da API configurada
- [ ] ID da instância (se aplicável)
- [ ] Token do webhook configurado
- [ ] Credenciais inseridas no EvAgendamento
- [ ] Integração testada com sucesso

### **WhatsApp ✅**
- [ ] Conta Business criada
- [ ] Aplicativo WhatsApp configurado
- [ ] Token de acesso gerado
- [ ] Número de telefone adicionado
- [ ] Webhook configurado (opcional)
- [ ] Credenciais inseridas no EvAgendamento
- [ ] Integração testada com sucesso

### **n8n ✅**
- [ ] n8n instalado e rodando
- [ ] Workflow criado
- [ ] Webhook URL configurada
- [ ] Autenticação configurada (se necessário)
- [ ] URL inserida no EvAgendamento
- [ ] Teste de webhook realizado

### **Sistema ✅**
- [ ] Configurações salvas
- [ ] Status das integrações verde
- [ ] Testes de conectividade OK
- [ ] Logs funcionando
- [ ] Backup das configurações feito

---

**🚀 Com essas configurações, seu EvAgendamento estará totalmente integrado e automatizado!** 🎉✨
