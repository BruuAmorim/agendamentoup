# 📡 URLs da API Pública para n8n

## 🔑 Autenticação

**Todas as rotas requerem o header:**
```
x-api-key: AEVUM_11_sua-chave-completa-aqui
```

**Base URL:** `http://172.19.64.1:3000/api/public/appointments`

---

## 📋 Rotas Disponíveis

### 1. **GET Slots Disponíveis**

**URL:**
```
GET http://172.19.64.1:3000/api/public/appointments/available/:date
```

**Parâmetros:**
- `date` (path): Data no formato `YYYY-MM-DD` (ex: `2026-02-12`)
- `duration` (query, opcional): Duração em minutos (padrão: 60)

**Exemplo no n8n:**
```
URL: http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
Query Parameters:
  duration: 60
Headers:
  x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
```

**Resposta:**
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

---

### 2. **POST Criar Agendamento**

**URL:**
```
POST http://172.19.64.1:3000/api/public/appointments
```

**Headers:**
```
x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
Content-Type: application/json
```

**Body:**
```json
{
  "customer_name": "João Silva",
  "customer_phone": "16978567568",
  "customer_email": "joao@email.com",
  "customer_cpf": "12345678900",
  "appointment_date": "2026-02-12",
  "appointment_time": "14:00",
  "service_type": "Corte",
  "duration_minutes": 60,
  "notes": "Agendamento via n8n"
}
```

**Campos Obrigatórios:**
- `customer_name` (string, mínimo 2 caracteres)
- `appointment_date` (string, formato: `YYYY-MM-DD`)
- `appointment_time` (string, formato: `HH:MM`)

**Campos Opcionais:**
- `customer_phone`
- `customer_email`
- `customer_cpf`
- `service_type`
- `duration_minutes` (padrão: 60)
- `notes`
- `extra_fields` (JSON)

**Exemplo no n8n:**
```
Method: POST
URL: http://172.19.64.1:3000/api/public/appointments
Headers:
  x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
  Content-Type: application/json
Body (JSON):
{
  "customer_name": "{{ $json.customer_name }}",
  "customer_phone": "{{ $json.customer_phone }}",
  "appointment_date": "{{ $json.appointment_date }}",
  "appointment_time": "{{ $json.appointment_time }}",
  "service_type": "{{ $json.service_type }}"
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
    "appointment_date": "2026-02-12",
    "appointment_time": "14:00",
    ...
  }
}
```

---

### 3. **PUT Atualizar Agendamento**

**URL:**
```
PUT http://172.19.64.1:3000/api/public/appointments/:id
```

**Parâmetros:**
- `id` (path): UUID do agendamento

**Headers:**
```
x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
Content-Type: application/json
```

**Body (campos a atualizar):**
```json
{
  "customer_name": "João Silva Santos",
  "appointment_date": "2026-02-13",
  "appointment_time": "15:00",
  "service_type": "Barba",
  "notes": "Reagendado via n8n"
}
```

**Exemplo no n8n:**
```
Method: PUT
URL: http://172.19.64.1:3000/api/public/appointments/{{ $json.appointment_id }}
Headers:
  x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
  Content-Type: application/json
Body (JSON):
{
  "appointment_date": "{{ $json.new_date }}",
  "appointment_time": "{{ $json.new_time }}"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Agendamento atualizado com sucesso",
  "data": {
    "id": "uuid-do-agendamento",
    "protocol": "AG-X9Y2",
    ...
  }
}
```

**Erros Possíveis:**
- `409 Conflict`: Horário já ocupado
- `400 Bad Request`: Dados inválidos ou fora do expediente
- `404 Not Found`: Agendamento não encontrado

---

### 4. **DELETE Deletar Agendamento**

**URL:**
```
DELETE http://172.19.64.1:3000/api/public/appointments/:id
```

**Parâmetros:**
- `id` (path): UUID do agendamento

**Headers:**
```
x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
```

**Exemplo no n8n:**
```
Method: DELETE
URL: http://172.19.64.1:3000/api/public/appointments/{{ $json.appointment_id }}
Headers:
  x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
```

**Resposta:**
```json
{
  "success": true,
  "message": "Agendamento deletado com sucesso"
}
```

**Erros Possíveis:**
- `404 Not Found`: Agendamento não encontrado
- `403 Forbidden`: Agendamento não pertence à empresa

---

## 📝 Exemplo Completo de Workflow n8n

### Workflow: Criar e Gerenciar Agendamento

1. **Webhook** (recebe dados do cliente)
   ```json
   {
     "customer_name": "Maria Silva",
     "customer_phone": "16978567568",
     "date": "2026-02-12",
     "time": "14:00"
   }
   ```

2. **GET Slots** (verificar disponibilidade)
   ```
   GET http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
   Header: x-api-key: AEVUM_11_...
   ```

3. **Code** (verificar se horário está disponível)
   ```javascript
   const requestedTime = $json.time;
   const slots = $node["GET Slots"].json.data.available_slots;
   const isAvailable = slots.some(s => s.time === requestedTime && s.available);
   
   return {
     ...$json,
     isAvailable,
     availableSlots: slots.filter(s => s.available)
   };
   ```

4. **Switch** (decidir próximo passo)
   - Se `isAvailable` → Criar agendamento
   - Se não → Sugerir horários alternativos

5. **POST Appointment** (criar agendamento)
   ```
   POST http://172.19.64.1:3000/api/public/appointments
   Body: {
     "customer_name": "{{ $json.customer_name }}",
     "customer_phone": "{{ $json.customer_phone }}",
     "appointment_date": "{{ $json.date }}",
     "appointment_time": "{{ $json.time }}"
   }
   ```

6. **Respond to Webhook** (confirmar ao cliente)
   ```json
   {
     "success": true,
     "protocol": "{{ $node['POST Appointment'].json.data.protocol }}",
     "message": "Agendamento confirmado!"
   }
   ```

---

## 🔍 Troubleshooting

### Erro: "Agendamento não encontrado" (404)

**Causa:** ID do agendamento incorreto ou agendamento não pertence à empresa.

**Solução:**
- Verifique se o ID está correto
- Use o ID retornado na criação do agendamento
- Verifique se o agendamento pertence à mesma empresa da API Key

### Erro: "Horário indisponível" (409)

**Causa:** Horário já está ocupado.

**Solução:**
- Consulte slots disponíveis antes de criar/atualizar
- Use um horário da lista de disponíveis

### Erro: "Fora do expediente" (400)

**Causa:** Horário fora do horário de funcionamento configurado.

**Solução:**
- Verifique os horários de funcionamento da empresa
- Use apenas horários dentro do expediente

---

## ✅ Checklist

- [ ] Backend está rodando em `172.19.64.1:3000`
- [ ] API Key está correta e completa
- [ ] Header `x-api-key` configurado (sem dois pontos)
- [ ] URLs usam IP ao invés de `localhost`
- [ ] Formato de data: `YYYY-MM-DD`
- [ ] Formato de hora: `HH:MM`
- [ ] Campos obrigatórios preenchidos

---

## 📚 Resumo das URLs

| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/public/appointments/available/:date` | Buscar slots disponíveis |
| POST | `/api/public/appointments` | Criar agendamento |
| PUT | `/api/public/appointments/:id` | Atualizar agendamento |
| DELETE | `/api/public/appointments/:id` | Deletar agendamento |

**Base URL:** `http://172.19.64.1:3000`





