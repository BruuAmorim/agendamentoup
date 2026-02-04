# 🤖 Integração EvAgendamento + n8n

Guia completo para configurar a integração entre o EvAgendamento e n8n, criando um recepcionista virtual inteligente.

## 📋 Visão Geral

A integração permite que o n8n atue como um recepcionista virtual, utilizando IA para:
- Receber solicitações de agendamento por telefone/SMS/chat
- Consultar disponibilidade na API do EvAgendamento
- Criar agendamentos automaticamente
- Confirmar agendamentos com clientes
- Gerenciar reagendamentos e cancelamentos

## 🛠️ Pré-requisitos

- EvAgendamento rodando e acessível
- Instância n8n configurada
- Conta Twilio (para SMS/telefone)
- OpenAI API Key (para IA conversacional)

## 🚀 Configuração Passo a Passo

### 1. Configurar Webhook no n8n

#### Criar Workflow Básico

1. Acesse seu n8n e crie um novo workflow
2. Adicione o nó **"Webhook"**
3. Configure:
   - **HTTP Method**: POST
   - **Path**: `/agendamento`
   - **Response Mode**: When Last Node Finishes

#### Configurações do Webhook
```json
{
  "authentication": "none",
  "responseMode": "responseNode",
  "responseData": "allEntries"
}
```

### 2. Receber Dados do Cliente

#### Nó de Entrada de Dados

Use um dos seguintes nós dependendo do canal:

**Para Twilio (SMS/Voz):**
- Nó: **Twilio**
- Configurar credenciais da conta Twilio
- Webhook URL: `https://seu-n8n.com/webhook/agendamento`

**Para Chat (Telegram/WhatsApp):**
- Nó: **Telegram** ou **WhatsApp Business**
- Configurar tokens de acesso

**Para Formulários Web:**
- Nó: **Webhook** adicional para formulários

### 3. Processamento com IA

#### Nó OpenAI/ChatGPT

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "Você é um recepcionista virtual inteligente. Sua função é extrair informações de agendamento das mensagens dos clientes. Identifique: nome, telefone, email, data desejada, horário preferido e tipo de serviço. Se alguma informação estiver faltando, pergunte educadamente. Sempre seja cortês e profissional."
    },
    {
      "role": "user",
      "content": "{{ $json.input.message }}"
    }
  ],
  "options": {
    "temperature": 0.3,
    "maxTokens": 500
  }
}
```

#### Prompt de Extração de Dados

```javascript
// Código para extrair dados da resposta da IA
const aiResponse = $node["OpenAI"].json.choices[0].message.content;

// Usar expressões regulares ou lógica para extrair:
const extractedData = {
  customer_name: extractName(aiResponse),
  customer_phone: extractPhone(aiResponse),
  customer_email: extractEmail(aiResponse),
  appointment_date: extractDate(aiResponse),
  appointment_time: extractTime(aiResponse),
  service_type: extractService(aiResponse),
  confidence: calculateConfidence(aiResponse)
};
```

### 4. Consultar Disponibilidade

#### Nó HTTP Request - Verificar Horários

```json
{
  "method": "GET",
  "url": "http://localhost:3000/api/appointments/available/{{ $json.extractedData.appointment_date }}",
  "sendQuery": true,
  "queryParameters": {
    "duration": "60"
  },
  "sendHeaders": false,
  "headerParameters": {},
  "sendBody": false
}
```

#### Processar Disponibilidade

```javascript
// Verificar se o horário solicitado está disponível
const requestedTime = $json.extractedData.appointment_time;
const availableSlots = $node["HTTP Request"].json.data.available_slots;

const isAvailable = availableSlots.some(slot =>
  slot.time === requestedTime
);

if (!isAvailable) {
  // Sugerir horários alternativos
  const alternatives = availableSlots.slice(0, 3);
  return {
    status: "alternative_suggested",
    alternatives: alternatives
  };
}

return {
  status: "available",
  confirmed_time: requestedTime
};
```

### 5. Criar Agendamento

#### Nó HTTP Request - Criar Agendamento

```json
{
  "method": "POST",
  "url": "http://localhost:3000/api/appointments",
  "sendHeaders": true,
  "headerParameters": {
    "Content-Type": "application/json"
  },
  "sendBody": true,
  "bodyParameters": {
    "customer_name": "{{ $json.extractedData.customer_name }}",
    "customer_email": "{{ $json.extractedData.customer_email }}",
    "customer_phone": "{{ $json.extractedData.customer_phone }}",
    "appointment_date": "{{ $json.extractedData.appointment_date }}",
    "appointment_time": "{{ $json.extractedData.appointment_time }}",
    "duration_minutes": 60,
    "notes": "Agendamento criado via n8n IA - {{ $json.input.source }}"
  }
}
```

### 6. Confirmar com Cliente

#### Nó OpenAI - Gerar Mensagem de Confirmação

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "Gere uma mensagem de confirmação educada e profissional para um agendamento. Use o nome do cliente e inclua todos os detalhes do agendamento."
    },
    {
      "role": "user",
      "content": "Cliente: {{ $json.customer_name }}, Data: {{ $json.appointment_date }}, Horário: {{ $json.appointment_time }}, Status: {{ $json.status }}"
    }
  ]
}
```

#### Enviar Confirmação

Use o nó apropriado para o canal de comunicação:
- **Twilio**: Para SMS/telefone
- **Telegram**: Para chat
- **Email**: Para confirmação por e-mail

### 7. Tratamento de Erros e Casos Especiais

#### Switch Node - Lidar com Diferentes Cenários

```javascript
const status = $node["Verificar Disponibilidade"].json.status;

switch (status) {
  case "available":
    return "criar_agendamento";

  case "alternative_suggested":
    return "sugerir_alternativas";

  case "no_slots":
    return "sem_vagas";

  default:
    return "erro";
}
```

#### Cenários de Tratamento

1. **Informações Incompletas**: Perguntar dados faltantes
2. **Horário Indisponível**: Sugerir alternativas
3. **Data Inválida**: Pedir correção
4. **Erro na API**: Mensagem de erro amigável

## 📱 Workflows de Exemplo

### Recepcionista por SMS

1. **Webhook** ← Recebe SMS do Twilio
2. **OpenAI** ← Processa mensagem e extrai dados
3. **HTTP Request** ← Consulta API do EvAgendamento
4. **Switch** ← Decide próximo passo
5. **HTTP Request** ← Cria agendamento (se disponível)
6. **Twilio** ← Envia confirmação por SMS

### Chatbot no Telegram

1. **Telegram Trigger** ← Recebe mensagem
2. **OpenAI** ← Entende intenção e extrai dados
3. **HTTP Request** ← Verifica disponibilidade
4. **Telegram** ← Envia resposta com opções
5. **Waiting Node** ← Aguarda resposta do usuário
6. **HTTP Request** ← Confirma agendamento
7. **Telegram** ← Envia confirmação

### Recepcionista por Telefone (Voz)

1. **Twilio** ← Recebe chamada
2. **OpenAI** ← Converte fala em texto
3. **OpenAI** ← Processa solicitação
4. **HTTP Request** ← Consulta disponibilidade
5. **Text-to-Speech** ← Gera resposta de voz
6. **Twilio** ← Reproduz resposta

## 🎯 Funções Avançadas da IA

### Entendimento Contextual

Configure a IA para entender:
- **Sinônimos**: "marcar horário", "agendar consulta", "reservar horário"
- **Formatos de Data**: "amanhã", "próxima sexta", "15 de janeiro"
- **Horários**: "duas horas", "14h30", "meio-dia"
- **Serviços**: Tipos diferentes de atendimento

### Lógica de Conversação

```javascript
// Manter contexto da conversa
const conversationHistory = $workflow.getContext('conversation_history') || [];

conversationHistory.push({
  role: 'user',
  content: $json.input.message,
  timestamp: new Date()
});

// Limitar histórico para não sobrecarregar
if (conversationHistory.length > 10) {
  conversationHistory = conversationHistory.slice(-10);
}

$workflow.setContext('conversation_history', conversationHistory);
```

### Sugestões Inteligentes

A IA pode sugerir:
- **Horários Alternativos**: Quando o desejado não está disponível
- **Datas Próximas**: Quando a data escolhida é muito distante
- **Durações Apropriadas**: Baseado no tipo de serviço
- **Lembretes**: Configurar lembretes automáticos

## 🔧 Monitoramento e Logs

### Dashboard de Performance

Configure nós para monitorar:
- **Taxa de Sucesso**: Agendamentos criados vs tentativas
- **Tempo de Resposta**: Velocidade da IA
- **Canais Mais Usados**: SMS vs Chat vs Telefone
- **Horários de Pico**: Quando há mais demanda

### Alertas e Notificações

```javascript
// Enviar alertas para problemas
if ($node["HTTP Request"].json.success === false) {
  // Enviar notificação para administrador
  $node["Discord"].json.content = `❌ Erro na API: ${$node["HTTP Request"].json.message}`;
}
```

## 🚀 Casos de Uso Avançados

### 1. Reagendamento Automático

Workflow que:
- Identifica agendamentos próximos
- Confirma com cliente via SMS
- Permite reagendamento por resposta

### 2. Lembretes Inteligentes

Sistema que:
- Calcula tempo ideal para lembrete
- Personaliza mensagem baseada no cliente
- Usa múltiplos canais (SMS + Email)

### 3. Análise de Satisfação

Após o atendimento:
- Envia pesquisa de satisfação
- Analisa respostas com IA
- Identifica padrões de melhoria

### 4. Recomendações Personalizadas

Baseado no histórico:
- Sugere horários preferidos
- Oferece serviços relacionados
- Ajusta comunicação baseada em perfil

## 🔒 Segurança e Privacidade

### Proteção de Dados

1. **Criptografia**: Dados sensíveis criptografados
2. **Anonimização**: Dados pessoais protegidos
3. **Conformidade**: LGPD/GDPR compliance
4. **Logs Seguros**: Não armazenar dados sensíveis em logs

### Rate Limiting

Configure limites para:
- Número de mensagens por usuário
- Frequência de consultas à API
- Tentativas de agendamento por hora

## 📊 Métricas de Sucesso

### KPIs para Acompanhar

- **Conversão**: Mensagens → Agendamentos criados
- **Satisfação**: Respostas positivas nas pesquisas
- **Eficiência**: Tempo médio para criar agendamento
- **Custos**: Redução de custos operacionais

### Dashboards

Configure dashboards no n8n para visualizar:
- Performance por canal
- Tendências de demanda
- Satisfação do cliente
- Tempo de resposta

## 🐛 Troubleshooting

### Problemas Comuns

1. **IA não entende mensagem**
   - Ajustar prompt e temperatura
   - Adicionar mais exemplos de treinamento

2. **API retorna erro**
   - Verificar conectividade
   - Validar formato dos dados enviados

3. **Webhook não recebe dados**
   - Verificar URL do webhook
   - Confirmar configurações de segurança

4. **Cliente não recebe confirmação**
   - Verificar configurações do canal
   - Confirmar limites de API do provedor

## 📚 Recursos Adicionais

- [Documentação n8n](https://docs.n8n.io/)
- [API Reference EvAgendamento](API_REFERENCE.md)
- [Exemplos de Workflows](https://github.com/n8n-io/n8n-examples)
- [Comunidade n8n](https://community.n8n.io/)

---

<div align="center">
  <p>🚀 <strong>EvAgendamento + n8n = Recepcionista Virtual Inteligente</strong> 🚀</p>
  <p>Automatize seu atendimento e encante seus clientes com IA!</p>
</div>



