# 🧪 Guia Completo de Testes - EvAgendamento

Este guia mostra como testar todas as funcionalidades do sistema EvAgendamento de forma sistemática e completa.

## 📋 Visão Geral dos Testes

### **Níveis de Teste:**
1. **🛠️ Backend (API)** - Testes da API REST
2. **🖥️ Frontend** - Testes da interface web
3. **🔗 Integração** - Testes entre componentes
4. **🤖 n8n** - Testes da integração IA
5. **🚀 E2E** - Testes completos ponta a ponta

---

## 🛠️ **1. TESTES DO BACKEND (API)**

### **Pré-requisitos:**
```bash
# Servidor deve estar rodando
npm start

# Verificar se está funcionando
curl http://localhost:3000/health
```

### **1.1 Health Check**
```bash
# Teste básico de conectividade
curl http://localhost:3000/health

# Resultado esperado:
{
  "status": "OK",
  "timestamp": "2024-01-XX...",
  "service": "EvAgendamento API"
}
```

### **1.2 Testes de Agendamentos**

#### **Criar Agendamento**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva",
    "customer_phone": "(11) 99999-9999",
    "appointment_date": "2026-01-25",
    "appointment_time": "14:00",
    "duration_minutes": 60,
    "notes": "Teste de criação"
  }'

# Resultado esperado: HTTP 201, ID do agendamento
```

#### **Listar Agendamentos**
```bash
# Todos os agendamentos
curl http://localhost:3000/api/appointments

# Agendamentos de uma data específica
curl "http://localhost:3000/api/appointments?date=2026-01-25"

# Agendamento específico por ID
curl http://localhost:3000/api/appointments/{ID}
```

#### **Verificar Disponibilidade**
```bash
# Horários disponíveis para uma data
curl "http://localhost:3000/api/appointments/available/2026-01-25?duration=60"

# Resultado esperado: Lista de horários disponíveis
{
  "success": true,
  "data": {
    "date": "2026-01-25",
    "available_slots": [
      {"time": "08:00", "duration": 60},
      {"time": "09:00", "duration": 60}
    ]
  }
}
```

#### **Atualizar Agendamento**
```bash
curl -X PUT http://localhost:3000/api/appointments/{ID} \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva Atualizado",
    "appointment_time": "15:00"
  }'
```

#### **Cancelar Agendamento**
```bash
curl -X PUT http://localhost:3000/api/appointments/{ID}/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Cliente cancelou"
  }'
```

#### **Excluir Agendamento**
```bash
curl -X DELETE http://localhost:3000/api/appointments/{ID}
```

### **1.3 Testes de Validação**

#### **Dados Inválidos**
```bash
# Nome vazio
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"customer_name": "", "appointment_date": "2026-01-25", "appointment_time": "14:00"}'

# Resultado esperado: HTTP 400, "Nome do cliente é obrigatório"
```

#### **Data no Passado**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva",
    "appointment_date": "2020-01-01",
    "appointment_time": "14:00"
  }'

# Resultado esperado: HTTP 400, "Data do agendamento não pode ser no passado"
```

#### **Conflito de Horário**
```bash
# Criar primeiro agendamento
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Cliente 1",
    "appointment_date": "2026-01-25",
    "appointment_time": "14:00"
  }'

# Tentar criar segundo no mesmo horário
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Cliente 2",
    "appointment_date": "2026-01-25",
    "appointment_time": "14:00"
  }'

# Resultado esperado: HTTP 400, "Horário indisponível - conflito"
```

### **1.4 Testes de Performance**

#### **Rate Limiting**
```bash
# Fazer muitas requisições rápidas
for i in {1..20}; do
  curl -X GET http://localhost:3000/api/appointments &
done

# Resultado esperado: Algumas requisições devem retornar HTTP 429
```

---

## 🖥️ **2. TESTES DO FRONTEND**

### **Pré-requisitos:**
```bash
# Servidor backend deve estar rodando
npm start

# Abrir arquivos HTML diretamente no navegador
# OU usar um servidor local (recomendado)
```

### **2.1 Testes Básicos**

#### **Página de Teste Simples**
```
Arquivo: frontend/test.html

Testes a fazer:
✅ Health Check - Deve retornar OK
✅ Buscar Horários - Deve mostrar slots disponíveis
✅ Criar Agendamento - Deve criar com dados únicos
✅ Criar Múltiplos - Deve funcionar sem conflitos
```

#### **Diagnóstico Completo**
```
Arquivo: frontend/diagnostico.html

Testes a fazer:
✅ Conectividade Básica
✅ Health Check da API
✅ Configuração CORS
✅ Criação de Agendamento
✅ Todos devem passar
```

### **2.2 Testes da Interface Principal**

#### **Aplicação Completa**
```
Arquivo: frontend/index.html

Cenários de teste:
```

**Criar Agendamento:**
1. Preencher nome, telefone
2. Selecionar data futura
3. Clicar "Verificar Disponibilidade"
4. Selecionar um horário disponível
5. Clicar "Criar Agendamento"
6. ✅ Deve aparecer toast verde "Agendamento criado com sucesso"

**Visualizar Agendamentos:**
1. Selecionar uma data no filtro
2. ✅ Deve mostrar agendamentos do dia
3. Clicar em um agendamento
4. ✅ Deve abrir modal com detalhes

**Editar Agendamento:**
1. Clicar no ícone ✏️ de um agendamento
2. Alterar dados no modal
3. Clicar "Salvar"
4. ✅ Deve atualizar e mostrar toast de sucesso

**Cancelar Agendamento:**
1. Clicar no ícone ❌ de um agendamento
2. Confirmar no dialog
3. ✅ Deve cancelar e atualizar lista

### **2.3 Testes de Responsividade**

#### **Desktop (1024px+)**
- ✅ Layout lado a lado funciona
- ✅ Cards organizados corretamente

#### **Tablet (768px-1024px)**
- ✅ Layout se adapta
- ✅ Navegação touch funciona

#### **Mobile (até 768px)**
- ✅ Layout vertical
- ✅ Botões acessíveis
- ✅ Formulários funcionam

### **2.4 Testes de Tema**

#### **Modo Claro/Escuro**
1. Clicar no toggle 🌙/☀️ no header
2. ✅ Tema deve alternar
3. ✅ Preferência deve ser salva
4. ✅ Página deve manter tema ao recarregar

---

## 🔗 **3. TESTES DE INTEGRAÇÃO**

### **3.1 Testes Automáticos**

#### **Script de Teste Completo**
```bash
# Criar script de teste
cat > test-integration.js << 'EOF'
const API_BASE = 'http://localhost:3000/api';

async function testIntegration() {
    console.log('🚀 Iniciando testes de integração...');

    try {
        // 1. Health Check
        const health = await fetch(`${API_BASE}/../health`);
        if (!health.ok) throw new Error('Health check falhou');

        // 2. Criar agendamento
        const appointment = {
            customer_name: 'Teste Integração',
            customer_phone: '(11) 99999-9999',
            appointment_date: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
            appointment_time: '10:00',
            duration_minutes: 60
        };

        const createResponse = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointment)
        });

        if (!createResponse.ok) throw new Error('Criação falhou');
        const createData = await createResponse.json();
        const appointmentId = createData.data.id;

        // 3. Buscar agendamento
        const getResponse = await fetch(`${API_BASE}/appointments/${appointmentId}`);
        if (!getResponse.ok) throw new Error('Busca falhou');

        // 4. Listar agendamentos
        const listResponse = await fetch(`${API_BASE}/appointments?date=${appointment.appointment_date}`);
        if (!listResponse.ok) throw new Error('Listagem falhou');

        // 5. Verificar disponibilidade
        const availableResponse = await fetch(`${API_BASE}/appointments/available/${appointment.appointment_date}`);
        if (!availableResponse.ok) throw new Error('Verificação de disponibilidade falhou');

        // 6. Atualizar agendamento
        const updateResponse = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_name: 'Teste Atualizado' })
        });
        if (!updateResponse.ok) throw new Error('Atualização falhou');

        // 7. Cancelar agendamento
        const cancelResponse = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Teste' })
        });
        if (!cancelResponse.ok) throw new Error('Cancelamento falhou');

        // 8. Excluir agendamento
        const deleteResponse = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'DELETE'
        });
        if (!deleteResponse.ok) throw new Error('Exclusão falhou');

        console.log('✅ Todos os testes de integração passaram!');

    } catch (error) {
        console.error('❌ Teste de integração falhou:', error.message);
    }
}

testIntegration();
EOF

# Executar teste
node test-integration.js
```

---

## 🤖 **4. TESTES DA INTEGRAÇÃO N8N**

### **Pré-requisitos:**
```bash
# n8n deve estar instalado e rodando
# Verificar documentação: INTEGRACAO_N8N.md
```

### **4.1 Testes do Webhook**

#### **Webhook Básico**
```bash
# Simular dados que n8n enviaria
curl -X POST http://localhost:3000/webhook/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "event": "new_appointment_request",
    "data": {
      "customer_name": "Maria Silva",
      "customer_phone": "(11) 98888-8888",
      "appointment_date": "2026-01-25",
      "appointment_time": "14:00",
      "service_type": "consulta"
    }
  }'
```

#### **Webhook com IA Processada**
```bash
curl -X POST http://localhost:3000/webhook/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ai_processed",
    "appointment": {
      "customer_name": "João Santos",
      "customer_phone": "(11) 97777-7777",
      "appointment_date": "2026-01-25",
      "appointment_time": "15:00",
      "confidence": 0.95
    }
  }'
```

### **4.2 Cenários de IA**

#### **Processamento Correto**
```
Input: "Olá, gostaria de agendar uma consulta para amanhã às 14h no nome de Ana"

Output esperado:
- Nome: Ana
- Data: amanhã
- Horário: 14:00
- Confiança: alta
```

#### **Dados Incompletos**
```
Input: "Quero marcar um horário"

Output esperado:
- Sistema pede mais informações
- Não cria agendamento automático
```

#### **Horário Indisponível**
```
Input: "Agendar para sexta às 10h"

Output esperado:
- Sistema verifica disponibilidade
- Sugere horários alternativos
- Confirma com usuário antes de agendar
```

### **4.3 Testes de Conversação**

#### **Fluxo Completo de Conversa**
1. **Usuário:** "Oi, quero agendar uma consulta"
2. **IA:** "Olá! Para qual dia você gostaria de agendar?"
3. **Usuário:** "Amanhã às 14h"
4. **IA:** "Perfeito! Vou verificar se amanhã às 14h está disponível..."
5. **IA:** "✅ Disponível! Confirmo o agendamento para amanhã às 14h?"
6. **Usuário:** "Sim"
7. **IA:** "✅ Agendamento confirmado! Você receberá um SMS de confirmação."

---

## 🚀 **5. TESTES E2E (Ponta a Ponta)**

### **5.1 Cenário Completo**

#### **Via Interface Web**
1. **Acessar** `frontend/index.html`
2. **Criar agendamento** através do formulário
3. **Verificar** na lista de agendamentos
4. **Editar** o agendamento criado
5. **Cancelar** o agendamento
6. **Confirmar** que não aparece mais na lista

#### **Via API + Interface**
1. **Criar** agendamento via API
2. **Verificar** na interface web
3. **Editar** via interface
4. **Confirmar** atualização via API

### **5.2 Testes de Stress**

#### **Múltiplos Agendamentos Simultâneos**
```bash
# Criar 10 agendamentos simultâneos
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/appointments \
    -H "Content-Type: application/json" \
    -d "{\"customer_name\":\"Cliente $i\", \"appointment_date\":\"2026-01-25\", \"appointment_time\":\"$(printf '%02d:00' $((9+i)))\", \"customer_phone\":\"(11) 99999-9999\"}" &
done
```

#### **Teste de Concorrência**
- Múltiplos usuários tentando agendar o mesmo horário
- Sistema deve permitir apenas um
- Outros devem receber erro de conflito

### **5.3 Testes de Recuperação**

#### **Reinício do Servidor**
1. Criar alguns agendamentos
2. Reiniciar servidor (`Ctrl+C` depois `npm start`)
3. Verificar se dados persistem (se usando PostgreSQL)
4. Ou verificar se voltam ao estado inicial (se usando memória)

#### **Conexão Interrompida**
1. Criar agendamento
2. Desconectar internet momentaneamente
3. Tentar operação quando voltar
4. Verificar consistência dos dados

---

## 📊 **6. RELATÓRIOS DE TESTE**

### **6.1 Checklist de Validação**

#### **Backend ✅**
- [ ] Health check funciona
- [ ] CRUD completo de agendamentos
- [ ] Validações de dados
- [ ] Verificação de conflitos
- [ ] Rate limiting ativo
- [ ] Tratamento de erros

#### **Frontend ✅**
- [ ] Interface carrega corretamente
- [ ] Formulários funcionam
- [ ] Temas alternam
- [ ] Responsividade OK
- [ ] Navegação fluida
- [ ] Feedbacks visuais

#### **Integração ✅**
- [ ] API + Frontend comunicam
- [ ] Dados sincronizados
- [ ] Estados consistentes
- [ ] Performance adequada

#### **n8n ✅**
- [ ] Webhooks funcionam
- [ ] IA processa corretamente
- [ ] Conversação natural
- [ ] Confirmações automáticas

### **6.2 Métricas de Qualidade**

#### **Performance**
- Tempo de resposta médio: < 500ms
- Taxa de sucesso: > 95%
- Throughput: X requisições/segundo

#### **Confiabilidade**
- Uptime: > 99%
- Error rate: < 5%
- Recovery time: < 30s

#### **Usabilidade**
- Taxa de conclusão: > 90%
- Tempo médio de tarefa: < 2min
- Satisfação do usuário: > 8/10

---

## 🐛 **7. DEBUGGING E TROUBLESHOOTING**

### **7.1 Problemas Comuns**

#### **"Failed to fetch"**
```
Causa: Servidor não está rodando
Solução: npm start
```

#### **"Horário indisponível"**
```
Causa: Conflito de horário
Solução: Escolher horário diferente ou limpar testes anteriores
```

#### **"Data no passado"**
```
Causa: Data inválida
Solução: Usar datas futuras nos testes
```

#### **Interface não carrega**
```
Causa: CORS ou caminhos errados
Solução: Verificar configurações e usar datas dinâmicas
```

### **7.2 Logs de Debug**

#### **Backend**
```bash
# Ver logs detalhados
tail -f logs/app.log
```

#### **Frontend**
```javascript
// Console do navegador (F12)
console.log('Dados enviados:', data);
console.log('Resposta recebida:', response);
```

#### **n8n**
```
# Verificar logs no painel n8n
# Verificar execução dos workflows
```

---

## 🎯 **8. EXECUÇÃO RÁPIDA**

### **Teste Express (5 minutos)**
```bash
# 1. Iniciar servidor
npm start

# 2. Testar API básica
curl http://localhost:3000/health

# 3. Abrir interface
start frontend/test.html

# 4. Criar agendamento de teste
# 5. Verificar na interface principal
start frontend/index.html
```

### **Teste Completo (30 minutos)**
```bash
# Seguir checklist completo
# Testar todos os cenários
# Verificar integrações
# Documentar resultados
```

---

## 📞 **SUPORTE**

Se encontrar problemas durante os testes:

1. **Verificar logs** do console/terminal
2. **Comparar** com resultados esperados
3. **Consultar** `TROUBLESHOOTING.md`
4. **Executar diagnóstico:** `frontend/diagnostico.html`

**🚀 Sistema pronto para produção quando todos os testes passarem!**

Este guia mostra como testar todas as funcionalidades do sistema EvAgendamento de forma sistemática e completa.

## 📋 Visão Geral dos Testes

### **Níveis de Teste:**
1. **🛠️ Backend (API)** - Testes da API REST
2. **🖥️ Frontend** - Testes da interface web
3. **🔗 Integração** - Testes entre componentes
4. **🤖 n8n** - Testes da integração IA
5. **🚀 E2E** - Testes completos ponta a ponta

---

## 🛠️ **1. TESTES DO BACKEND (API)**

### **Pré-requisitos:**
```bash
# Servidor deve estar rodando
npm start

# Verificar se está funcionando
curl http://localhost:3000/health
```

### **1.1 Health Check**
```bash
# Teste básico de conectividade
curl http://localhost:3000/health

# Resultado esperado:
{
  "status": "OK",
  "timestamp": "2024-01-XX...",
  "service": "EvAgendamento API"
}
```

### **1.2 Testes de Agendamentos**

#### **Criar Agendamento**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva",
    "customer_phone": "(11) 99999-9999",
    "appointment_date": "2026-01-25",
    "appointment_time": "14:00",
    "duration_minutes": 60,
    "notes": "Teste de criação"
  }'

# Resultado esperado: HTTP 201, ID do agendamento
```

#### **Listar Agendamentos**
```bash
# Todos os agendamentos
curl http://localhost:3000/api/appointments

# Agendamentos de uma data específica
curl "http://localhost:3000/api/appointments?date=2026-01-25"

# Agendamento específico por ID
curl http://localhost:3000/api/appointments/{ID}
```

#### **Verificar Disponibilidade**
```bash
# Horários disponíveis para uma data
curl "http://localhost:3000/api/appointments/available/2026-01-25?duration=60"

# Resultado esperado: Lista de horários disponíveis
{
  "success": true,
  "data": {
    "date": "2026-01-25",
    "available_slots": [
      {"time": "08:00", "duration": 60},
      {"time": "09:00", "duration": 60}
    ]
  }
}
```

#### **Atualizar Agendamento**
```bash
curl -X PUT http://localhost:3000/api/appointments/{ID} \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva Atualizado",
    "appointment_time": "15:00"
  }'
```

#### **Cancelar Agendamento**
```bash
curl -X PUT http://localhost:3000/api/appointments/{ID}/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Cliente cancelou"
  }'
```

#### **Excluir Agendamento**
```bash
curl -X DELETE http://localhost:3000/api/appointments/{ID}
```

### **1.3 Testes de Validação**

#### **Dados Inválidos**
```bash
# Nome vazio
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"customer_name": "", "appointment_date": "2026-01-25", "appointment_time": "14:00"}'

# Resultado esperado: HTTP 400, "Nome do cliente é obrigatório"
```

#### **Data no Passado**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva",
    "appointment_date": "2020-01-01",
    "appointment_time": "14:00"
  }'

# Resultado esperado: HTTP 400, "Data do agendamento não pode ser no passado"
```

#### **Conflito de Horário**
```bash
# Criar primeiro agendamento
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Cliente 1",
    "appointment_date": "2026-01-25",
    "appointment_time": "14:00"
  }'

# Tentar criar segundo no mesmo horário
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Cliente 2",
    "appointment_date": "2026-01-25",
    "appointment_time": "14:00"
  }'

# Resultado esperado: HTTP 400, "Horário indisponível - conflito"
```

### **1.4 Testes de Performance**

#### **Rate Limiting**
```bash
# Fazer muitas requisições rápidas
for i in {1..20}; do
  curl -X GET http://localhost:3000/api/appointments &
done

# Resultado esperado: Algumas requisições devem retornar HTTP 429
```

---

## 🖥️ **2. TESTES DO FRONTEND**

### **Pré-requisitos:**
```bash
# Servidor backend deve estar rodando
npm start

# Abrir arquivos HTML diretamente no navegador
# OU usar um servidor local (recomendado)
```

### **2.1 Testes Básicos**

#### **Página de Teste Simples**
```
Arquivo: frontend/test.html

Testes a fazer:
✅ Health Check - Deve retornar OK
✅ Buscar Horários - Deve mostrar slots disponíveis
✅ Criar Agendamento - Deve criar com dados únicos
✅ Criar Múltiplos - Deve funcionar sem conflitos
```

#### **Diagnóstico Completo**
```
Arquivo: frontend/diagnostico.html

Testes a fazer:
✅ Conectividade Básica
✅ Health Check da API
✅ Configuração CORS
✅ Criação de Agendamento
✅ Todos devem passar
```

### **2.2 Testes da Interface Principal**

#### **Aplicação Completa**
```
Arquivo: frontend/index.html

Cenários de teste:
```

**Criar Agendamento:**
1. Preencher nome, telefone
2. Selecionar data futura
3. Clicar "Verificar Disponibilidade"
4. Selecionar um horário disponível
5. Clicar "Criar Agendamento"
6. ✅ Deve aparecer toast verde "Agendamento criado com sucesso"

**Visualizar Agendamentos:**
1. Selecionar uma data no filtro
2. ✅ Deve mostrar agendamentos do dia
3. Clicar em um agendamento
4. ✅ Deve abrir modal com detalhes

**Editar Agendamento:**
1. Clicar no ícone ✏️ de um agendamento
2. Alterar dados no modal
3. Clicar "Salvar"
4. ✅ Deve atualizar e mostrar toast de sucesso

**Cancelar Agendamento:**
1. Clicar no ícone ❌ de um agendamento
2. Confirmar no dialog
3. ✅ Deve cancelar e atualizar lista

### **2.3 Testes de Responsividade**

#### **Desktop (1024px+)**
- ✅ Layout lado a lado funciona
- ✅ Cards organizados corretamente

#### **Tablet (768px-1024px)**
- ✅ Layout se adapta
- ✅ Navegação touch funciona

#### **Mobile (até 768px)**
- ✅ Layout vertical
- ✅ Botões acessíveis
- ✅ Formulários funcionam

### **2.4 Testes de Tema**

#### **Modo Claro/Escuro**
1. Clicar no toggle 🌙/☀️ no header
2. ✅ Tema deve alternar
3. ✅ Preferência deve ser salva
4. ✅ Página deve manter tema ao recarregar

---

## 🔗 **3. TESTES DE INTEGRAÇÃO**

### **3.1 Testes Automáticos**

#### **Script de Teste Completo**
```bash
# Criar script de teste
cat > test-integration.js << 'EOF'
const API_BASE = 'http://localhost:3000/api';

async function testIntegration() {
    console.log('🚀 Iniciando testes de integração...');

    try {
        // 1. Health Check
        const health = await fetch(`${API_BASE}/../health`);
        if (!health.ok) throw new Error('Health check falhou');

        // 2. Criar agendamento
        const appointment = {
            customer_name: 'Teste Integração',
            customer_phone: '(11) 99999-9999',
            appointment_date: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
            appointment_time: '10:00',
            duration_minutes: 60
        };

        const createResponse = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointment)
        });

        if (!createResponse.ok) throw new Error('Criação falhou');
        const createData = await createResponse.json();
        const appointmentId = createData.data.id;

        // 3. Buscar agendamento
        const getResponse = await fetch(`${API_BASE}/appointments/${appointmentId}`);
        if (!getResponse.ok) throw new Error('Busca falhou');

        // 4. Listar agendamentos
        const listResponse = await fetch(`${API_BASE}/appointments?date=${appointment.appointment_date}`);
        if (!listResponse.ok) throw new Error('Listagem falhou');

        // 5. Verificar disponibilidade
        const availableResponse = await fetch(`${API_BASE}/appointments/available/${appointment.appointment_date}`);
        if (!availableResponse.ok) throw new Error('Verificação de disponibilidade falhou');

        // 6. Atualizar agendamento
        const updateResponse = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_name: 'Teste Atualizado' })
        });
        if (!updateResponse.ok) throw new Error('Atualização falhou');

        // 7. Cancelar agendamento
        const cancelResponse = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Teste' })
        });
        if (!cancelResponse.ok) throw new Error('Cancelamento falhou');

        // 8. Excluir agendamento
        const deleteResponse = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'DELETE'
        });
        if (!deleteResponse.ok) throw new Error('Exclusão falhou');

        console.log('✅ Todos os testes de integração passaram!');

    } catch (error) {
        console.error('❌ Teste de integração falhou:', error.message);
    }
}

testIntegration();
EOF

# Executar teste
node test-integration.js
```

---

## 🤖 **4. TESTES DA INTEGRAÇÃO N8N**

### **Pré-requisitos:**
```bash
# n8n deve estar instalado e rodando
# Verificar documentação: INTEGRACAO_N8N.md
```

### **4.1 Testes do Webhook**

#### **Webhook Básico**
```bash
# Simular dados que n8n enviaria
curl -X POST http://localhost:3000/webhook/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "event": "new_appointment_request",
    "data": {
      "customer_name": "Maria Silva",
      "customer_phone": "(11) 98888-8888",
      "appointment_date": "2026-01-25",
      "appointment_time": "14:00",
      "service_type": "consulta"
    }
  }'
```

#### **Webhook com IA Processada**
```bash
curl -X POST http://localhost:3000/webhook/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ai_processed",
    "appointment": {
      "customer_name": "João Santos",
      "customer_phone": "(11) 97777-7777",
      "appointment_date": "2026-01-25",
      "appointment_time": "15:00",
      "confidence": 0.95
    }
  }'
```

### **4.2 Cenários de IA**

#### **Processamento Correto**
```
Input: "Olá, gostaria de agendar uma consulta para amanhã às 14h no nome de Ana"

Output esperado:
- Nome: Ana
- Data: amanhã
- Horário: 14:00
- Confiança: alta
```

#### **Dados Incompletos**
```
Input: "Quero marcar um horário"

Output esperado:
- Sistema pede mais informações
- Não cria agendamento automático
```

#### **Horário Indisponível**
```
Input: "Agendar para sexta às 10h"

Output esperado:
- Sistema verifica disponibilidade
- Sugere horários alternativos
- Confirma com usuário antes de agendar
```

### **4.3 Testes de Conversação**

#### **Fluxo Completo de Conversa**
1. **Usuário:** "Oi, quero agendar uma consulta"
2. **IA:** "Olá! Para qual dia você gostaria de agendar?"
3. **Usuário:** "Amanhã às 14h"
4. **IA:** "Perfeito! Vou verificar se amanhã às 14h está disponível..."
5. **IA:** "✅ Disponível! Confirmo o agendamento para amanhã às 14h?"
6. **Usuário:** "Sim"
7. **IA:** "✅ Agendamento confirmado! Você receberá um SMS de confirmação."

---

## 🚀 **5. TESTES E2E (Ponta a Ponta)**

### **5.1 Cenário Completo**

#### **Via Interface Web**
1. **Acessar** `frontend/index.html`
2. **Criar agendamento** através do formulário
3. **Verificar** na lista de agendamentos
4. **Editar** o agendamento criado
5. **Cancelar** o agendamento
6. **Confirmar** que não aparece mais na lista

#### **Via API + Interface**
1. **Criar** agendamento via API
2. **Verificar** na interface web
3. **Editar** via interface
4. **Confirmar** atualização via API

### **5.2 Testes de Stress**

#### **Múltiplos Agendamentos Simultâneos**
```bash
# Criar 10 agendamentos simultâneos
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/appointments \
    -H "Content-Type: application/json" \
    -d "{\"customer_name\":\"Cliente $i\", \"appointment_date\":\"2026-01-25\", \"appointment_time\":\"$(printf '%02d:00' $((9+i)))\", \"customer_phone\":\"(11) 99999-9999\"}" &
done
```

#### **Teste de Concorrência**
- Múltiplos usuários tentando agendar o mesmo horário
- Sistema deve permitir apenas um
- Outros devem receber erro de conflito

### **5.3 Testes de Recuperação**

#### **Reinício do Servidor**
1. Criar alguns agendamentos
2. Reiniciar servidor (`Ctrl+C` depois `npm start`)
3. Verificar se dados persistem (se usando PostgreSQL)
4. Ou verificar se voltam ao estado inicial (se usando memória)

#### **Conexão Interrompida**
1. Criar agendamento
2. Desconectar internet momentaneamente
3. Tentar operação quando voltar
4. Verificar consistência dos dados

---

## 📊 **6. RELATÓRIOS DE TESTE**

### **6.1 Checklist de Validação**

#### **Backend ✅**
- [ ] Health check funciona
- [ ] CRUD completo de agendamentos
- [ ] Validações de dados
- [ ] Verificação de conflitos
- [ ] Rate limiting ativo
- [ ] Tratamento de erros

#### **Frontend ✅**
- [ ] Interface carrega corretamente
- [ ] Formulários funcionam
- [ ] Temas alternam
- [ ] Responsividade OK
- [ ] Navegação fluida
- [ ] Feedbacks visuais

#### **Integração ✅**
- [ ] API + Frontend comunicam
- [ ] Dados sincronizados
- [ ] Estados consistentes
- [ ] Performance adequada

#### **n8n ✅**
- [ ] Webhooks funcionam
- [ ] IA processa corretamente
- [ ] Conversação natural
- [ ] Confirmações automáticas

### **6.2 Métricas de Qualidade**

#### **Performance**
- Tempo de resposta médio: < 500ms
- Taxa de sucesso: > 95%
- Throughput: X requisições/segundo

#### **Confiabilidade**
- Uptime: > 99%
- Error rate: < 5%
- Recovery time: < 30s

#### **Usabilidade**
- Taxa de conclusão: > 90%
- Tempo médio de tarefa: < 2min
- Satisfação do usuário: > 8/10

---

## 🐛 **7. DEBUGGING E TROUBLESHOOTING**

### **7.1 Problemas Comuns**

#### **"Failed to fetch"**
```
Causa: Servidor não está rodando
Solução: npm start
```

#### **"Horário indisponível"**
```
Causa: Conflito de horário
Solução: Escolher horário diferente ou limpar testes anteriores
```

#### **"Data no passado"**
```
Causa: Data inválida
Solução: Usar datas futuras nos testes
```

#### **Interface não carrega**
```
Causa: CORS ou caminhos errados
Solução: Verificar configurações e usar datas dinâmicas
```

### **7.2 Logs de Debug**

#### **Backend**
```bash
# Ver logs detalhados
tail -f logs/app.log
```

#### **Frontend**
```javascript
// Console do navegador (F12)
console.log('Dados enviados:', data);
console.log('Resposta recebida:', response);
```

#### **n8n**
```
# Verificar logs no painel n8n
# Verificar execução dos workflows
```

---

## 🎯 **8. EXECUÇÃO RÁPIDA**

### **Teste Express (5 minutos)**
```bash
# 1. Iniciar servidor
npm start

# 2. Testar API básica
curl http://localhost:3000/health

# 3. Abrir interface
start frontend/test.html

# 4. Criar agendamento de teste
# 5. Verificar na interface principal
start frontend/index.html
```

### **Teste Completo (30 minutos)**
```bash
# Seguir checklist completo
# Testar todos os cenários
# Verificar integrações
# Documentar resultados
```

---

## 📞 **SUPORTE**

Se encontrar problemas durante os testes:

1. **Verificar logs** do console/terminal
2. **Comparar** com resultados esperados
3. **Consultar** `TROUBLESHOOTING.md`
4. **Executar diagnóstico:** `frontend/diagnostico.html`

**🚀 Sistema pronto para produção quando todos os testes passarem!**




