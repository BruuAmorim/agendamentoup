# 🔧 Guia de Configuração n8n - Aevum API

## ⚠️ Problemas Comuns e Soluções

### 1. Erro: "The service refused the connection"

**Causa:** O backend não está rodando ou não está acessível.

**Solução:**
1. Verifique se o backend está rodando:
   ```bash
   cd backend
   npm start
   ```
2. Verifique se está rodando na porta 3000:
   - Acesse: `http://localhost:3000/api/health`
   - Deve retornar: `{"status":"ok",...}`

3. Se usar ngrok ou servidor remoto:
   - Use a URL completa: `https://seu-dominio.com/api/...`
   - Não use `localhost` em servidores remotos

### 2. Erro: "undefined" nas variáveis

**Causa:** Variáveis não estão sendo resolvidas corretamente.

**Solução:**
- Use `{{ $json.campo }}` para dados do nó anterior
- Use `{{ $env.VARIAVEL }}` para variáveis de ambiente
- Verifique se o nó anterior está retornando dados corretos

### 3. Erro: "Unauthorized" ou "401"

**Causa:** API Key não está sendo enviada corretamente.

**Solução:**
- Verifique se o header `x-api-key` está configurado
- Use a API Key completa (não mascarada)
- Verifique se a API Key está correta no painel da empresa

---

## 📡 Rotas Disponíveis para n8n

### Rotas Públicas (usam API Key no header `x-api-key`)

#### 1. Buscar Horários Disponíveis
```
GET /api/public/appointments/available/:date
```

**Headers:**
```
x-api-key: AEVUM_10_sua-chave-completa-aqui
```

**Parâmetros:**
- `date` (path): Data no formato `YYYY-MM-DD` (ex: `2026-02-12`)
- `duration` (query, opcional): Duração em minutos (padrão: 60)

**Exemplo de URL:**
```
http://localhost:3000/api/public/appointments/available/2026-02-12?duration=60
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-12",
    "available_slots": [
      { "time": "09:00", "available": true },
      { "time": "09:30", "available": true },
      { "time": "10:00", "available": false }
    ]
  }
}
```

#### 2. Criar Agendamento
```
POST /api/public/appointments
```

**Headers:**
```
x-api-key: AEVUM_10_sua-chave-completa-aqui
Content-Type: application/json
```

**Body:**
```json
{
  "customer_name": "João Silva",
  "customer_phone": "16978567568",
  "customer_email": "joao@email.com",
  "appointment_date": "2026-02-12",
  "appointment_time": "14:00",
  "service_type": "Corte",
  "duration_minutes": 60,
  "notes": "Agendamento via n8n"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Agendamento criado com sucesso",
  "data": {
    "id": "uuid-do-agendamento",
    "protocol": "AG-X9Y2",
    "customer_name": "João Silva",
    ...
  }
}
```

---

## 🔑 Como Obter a API Key

1. Acesse o painel da empresa: `/app/settings`
2. Vá para a aba "Integrações"
3. Clique em "Gerar Nova API Key"
4. **COPIE A CHAVE IMEDIATAMENTE** (ela não será exibida novamente)
5. Formato: `AEVUM_<empresaId>_<64 caracteres>`

---

## ⚙️ Configuração no n8n

### Passo 1: Configurar HTTP Request para Slots

**Nó:** HTTP Request

**Configuração:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/public/appointments/available/{{ $json.date }}`
  - Ou use variável: `http://localhost:3000/api/public/appointments/available/{{ $('Extract Date').item.json.date }}`
- **Authentication:** `None`
- **Headers:**
  - `x-api-key`: `{{ $env.AEVUM_API_KEY }}`
    - Ou use valor direto: `AEVUM_10_sua-chave-aqui`
- **Query Parameters:**
  - `duration`: `60` (opcional)

**Exemplo com variável de data:**
```
URL: http://localhost:3000/api/public/appointments/available/{{ $json.date }}
```

### Passo 2: Configurar HTTP Request para Criar Agendamento

**Nó:** HTTP Request

**Configuração:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/public/appointments`
- **Authentication:** `None`
- **Headers:**
  - `x-api-key`: `{{ $env.AEVUM_API_KEY }}`
  - `Content-Type`: `application/json`
- **Body:**
```json
{
  "customer_name": "{{ $json.customer_name }}",
  "customer_phone": "{{ $json.customer_phone }}",
  "customer_email": "{{ $json.customer_email }}",
  "appointment_date": "{{ $json.appointment_date }}",
  "appointment_time": "{{ $json.appointment_time }}",
  "service_type": "{{ $json.service_type }}",
  "duration_minutes": 60,
  "notes": "Agendamento via n8n"
}
```

---

## 🐛 Troubleshooting Detalhado

### Problema: URL com barras duplas (`//`)

**Erro:** `http://localhost:3000//api/moderator/setting`

**Solução:**
- Remova a barra dupla
- Use: `http://localhost:3000/api/public/appointments/available/...`
- Não use: `http://localhost:3000/api/public/appointments/available//...`

### Problema: Variável `date` undefined

**Causa:** O nó anterior não está retornando `date` no formato correto.

**Solução:**
1. Adicione um nó "Set" antes do HTTP Request:
   ```json
   {
     "date": "{{ $json.date || $json.appointment_date || '2026-02-12' }}"
   }
   ```

2. Ou formate a data no nó anterior:
   ```javascript
   // No Code node
   const date = new Date($json.date);
   const formattedDate = date.toISOString().split('T')[0];
   return { date: formattedDate };
   ```

### Problema: API Key undefined

**Causa:** Variável de ambiente não configurada ou nome incorreto.

**Solução:**
1. Configure variável de ambiente no n8n:
   - Nome: `AEVUM_API_KEY`
   - Valor: `AEVUM_10_sua-chave-completa-aqui`

2. Ou use valor direto no header:
   ```
   x-api-key: AEVUM_10_sua-chave-completa-aqui
   ```

### Problema: Backend não acessível do n8n

**Causa:** n8n está em servidor diferente ou Docker.

**Solução:**
1. Se n8n está em Docker e backend em host:
   - Use `host.docker.internal:3000` ao invés de `localhost:3000`
   - Ou use IP da máquina: `192.168.1.100:3000`

2. Se ambos estão em servidores diferentes:
   - Use ngrok ou URL pública
   - Configure CORS no backend (já configurado)

---

## 📋 Exemplo Completo de Workflow

### Workflow: Consultar Slots Disponíveis

1. **Webhook** (recebe dados)
   ```json
   {
     "date": "2026-02-12",
     "phone": "16978567568"
   }
   ```

2. **Set** (preparar dados)
   ```json
   {
     "date": "{{ $json.date }}",
     "formatted_date": "{{ $json.date }}"
   }
   ```

3. **HTTP Request** (buscar slots)
   - Method: `GET`
   - URL: `http://localhost:3000/api/public/appointments/available/{{ $json.date }}`
   - Headers:
     - `x-api-key`: `{{ $env.AEVUM_API_KEY }}`

4. **Code** (processar resposta)
   ```javascript
   const slots = $json.data.available_slots;
   const available = slots.filter(s => s.available);
   return {
     total_slots: slots.length,
     available_slots: available.length,
     slots: available
   };
   ```

5. **Respond to Webhook** (retornar dados)
   ```json
   {
     "success": true,
     "available_slots": "{{ $json.available_slots }}",
     "slots": "{{ $json.slots }}"
   }
   ```

---

## ✅ Checklist de Configuração

- [ ] Backend está rodando na porta 3000
- [ ] API Key foi gerada e copiada
- [ ] URL está correta (sem barras duplas)
- [ ] Header `x-api-key` está configurado
- [ ] Formato da data está correto (`YYYY-MM-DD`)
- [ ] Variáveis estão sendo resolvidas corretamente
- [ ] CORS está configurado (já está no backend)
- [ ] Teste a rota `/api/health` primeiro

---

## 🔍 Testando a Configuração

### Teste 1: Health Check
```bash
curl http://localhost:3000/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "message": "Aevum API está funcionando"
}
```

### Teste 2: Slots com API Key
```bash
curl -X GET \
  "http://localhost:3000/api/public/appointments/available/2026-02-12?duration=60" \
  -H "x-api-key: AEVUM_10_sua-chave-aqui"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-12",
    "available_slots": [...]
  }
}
```

---

## 📞 Suporte

Se ainda tiver problemas:
1. Verifique os logs do backend
2. Verifique os logs do n8n
3. Teste a API diretamente com curl/Postman
4. Verifique se a API Key está correta no banco de dados





