# 🔧 Correção: Erro 401 ao Criar Agendamento no n8n

## ❌ Problema

Ao tentar criar um agendamento via n8n, você recebe o erro:
```
401 Unauthorized
"Token de acesso não fornecido"
```

## 🔍 Causa

Você está usando a rota **ERRADA**:
- ❌ `/api/appointments` - Requer autenticação JWT (token de login)
- ✅ `/api/public/appointments` - Aceita API Key no header

## ✅ Solução

### 1. Corrigir a URL no n8n

**Altere a URL de:**
```
https://gulpy-semicylindrical-minta.ngrok-free.dev/api/appointments
```

**Para:**
```
https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments
```

### 2. Configuração Completa no n8n

#### Nó HTTP Request - POST Appointment

**URL:**
```
https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments
```

**Method:** `POST`

**Headers:**
```json
{
  "x-api-key": "AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13",
  "Content-Type": "application/json"
}
```

**Body (JSON):**
```json
{
  "customer_name": "{{ $json.name }}",
  "customer_phone": "{{ $json.phone }}",
  "appointment_date": "{{ $json.date }}",
  "appointment_time": "{{ $json.time }}",
  "service_type": "{{ $json.service }}"
}
```

---

## 📋 Rotas Públicas Disponíveis (com API Key)

### 1. **POST - Criar Agendamento**
```
POST https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments
```

### 2. **GET - Horários Disponíveis**
```
GET https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments/available/{{ $json.date }}
```

### 3. **PUT - Atualizar Agendamento**
```
PUT https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments/{{ $json.id }}
```

### 4. **DELETE - Deletar Agendamento**
```
DELETE https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments/{{ $json.id }}
```

### 5. **GET - Serviços da Empresa**
```
GET https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/company/services
```

---

## 🔑 Autenticação

**Todas as rotas públicas requerem o header:**
```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

⚠️ **IMPORTANTE:**
- Use sua API Key real (a do exemplo é apenas ilustrativa)
- A API Key deve estar completa, incluindo o prefixo `AEVUM_11_`
- Não adicione dois pontos (`:`) no final do header

---

## 📝 Exemplo Completo de Body

### Criar Agendamento (POST)

```json
{
  "customer_name": "Bruna",
  "customer_phone": "551637063159",
  "customer_email": "bruna@email.com",
  "customer_cpf": "12345678900",
  "appointment_date": "2026-02-13",
  "appointment_time": "16:00",
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

---

## ✅ Resposta de Sucesso

```json
{
  "success": true,
  "message": "Agendamento criado com sucesso",
  "data": {
    "id": "uuid-do-agendamento",
    "protocol": "AG-X9Y2",
    "customer_name": "Bruna",
    "customer_phone": "551637063159",
    "appointment_date": "2026-02-13",
    "appointment_time": "16:00",
    "service_type": "Corte",
    "status": "scheduled",
    "created_at": "2026-01-XX..."
  }
}
```

---

## 🧪 Teste Rápido

### Via cURL:
```bash
curl -X POST https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments \
  -H "x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Teste",
    "appointment_date": "2026-02-13",
    "appointment_time": "16:00"
  }'
```

### Via Postman:
1. **Method:** POST
2. **URL:** `https://gulpy-semicylindrical-minta.ngrok-free.dev/api/public/appointments`
3. **Headers:**
   - `x-api-key`: `AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13`
   - `Content-Type`: `application/json`
4. **Body (raw JSON):**
```json
{
  "customer_name": "Teste",
  "appointment_date": "2026-02-13",
  "appointment_time": "16:00"
}
```

---

## ⚠️ Erros Comuns

### 1. **401 Unauthorized**
- ❌ URL errada: `/api/appointments` (sem `/public`)
- ✅ URL correta: `/api/public/appointments`

### 2. **400 Bad Request**
- Verifique o formato da data: `YYYY-MM-DD` (ex: `2026-02-13`)
- Verifique o formato da hora: `HH:MM` (ex: `16:00`)
- Verifique se `customer_name` tem pelo menos 2 caracteres

### 3. **409 Conflict**
- Horário já está ocupado
- Use `/api/public/appointments/available/:date` para verificar disponibilidade antes

### 4. **403 Forbidden**
- API Key inválida ou não pertence à empresa
- Verifique se a API Key está completa e correta

---

## 🔄 Checklist de Correção

- [ ] URL alterada para `/api/public/appointments`
- [ ] Header `x-api-key` configurado corretamente
- [ ] API Key completa (com prefixo `AEVUM_11_`)
- [ ] Formato de data: `YYYY-MM-DD`
- [ ] Formato de hora: `HH:MM`
- [ ] Campo `customer_name` preenchido (mínimo 2 caracteres)
- [ ] Campo `appointment_date` preenchido
- [ ] Campo `appointment_time` preenchido

---

## 📚 Referências

- [URLs da API Pública](URLS_API_PUBLICA_N8N.md)
- [Guia ngrok + n8n](GUIA_NGROK_N8N.md)
- [Solução n8n Offline](SOLUCAO_N8N_OFFLINE.md)

---

**Pronto!** Após corrigir a URL para `/api/public/appointments`, o erro 401 deve ser resolvido! 🚀



