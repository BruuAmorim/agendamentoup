# 🔧 Correção: URL no n8n - ECONNREFUSED

## ⚠️ Problema Identificado

Erro: `ECONNREFUSED ::1:3000`

**Causa:** O n8n está usando `localhost:3000`, mas quando o n8n está em Docker, `localhost` não aponta para a máquina host.

---

## ✅ Solução: Alterar URL no n8n

### **URL Atual (ERRADA):**
```
http://localhost:3000/api/public/company/services
```

### **URL Correta:**

**Se n8n está em Docker:**
```
http://host.docker.internal:3000/api/public/company/services
```

**OU use o IP diretamente:**
```
http://172.19.64.1:3000/api/public/company/services
```

---

## 📋 Configuração Correta no n8n

### **Nó HTTP Request - buscar_servicos:**

**Method:** `GET`

**URL (CORRIGIR):**
```
http://172.19.64.1:3000/api/public/company/services
```

**Headers:**
- **Name:** `x-api-key`
- **Value:** `AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13`

**Settings:**
- **Timeout:** `30000` (30 segundos)
- **Retry on Fail:** ✅ Ativado

---

## 🔍 Por Que `localhost` Não Funciona?

Quando o n8n está em Docker:
- `localhost` dentro do container = o próprio container
- `localhost` NÃO aponta para a máquina host
- Por isso precisa usar `host.docker.internal` ou o IP da máquina

---

## ✅ Checklist de Correção

1. **No n8n, altere a URL:**
   - ❌ `http://localhost:3000/api/public/company/services`
   - ✅ `http://172.19.64.1:3000/api/public/company/services`

2. **Verifique se o backend está rodando:**
   ```powershell
   netstat -ano | findstr ":3000"
   ```

3. **Teste a rota localmente:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/public/company/services" -Headers @{"x-api-key"="AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13"} -UseBasicParsing
   ```

4. **Teste no n8n novamente**

---

## 🚀 URLs Corretas para Todas as Rotas

### **Buscar Serviços:**
```
http://172.19.64.1:3000/api/public/company/services
```

### **Slots Disponíveis:**
```
http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
```

### **Criar Agendamento:**
```
http://172.19.64.1:3000/api/public/appointments
```

### **Atualizar Agendamento:**
```
http://172.19.64.1:3000/api/public/appointments/{{ $json.appointment_id }}
```

### **Deletar Agendamento:**
```
http://172.19.64.1:3000/api/public/appointments/{{ $json.appointment_id }}
```

**Todas usam o mesmo header:**
```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

---

## ⚠️ Importante

**NUNCA use `localhost` no n8n se ele estiver em Docker!**

**Sempre use:**
- `172.19.64.1` (IP da máquina host)
- OU `host.docker.internal` (se configurado no docker-compose)

---

## 🔄 Se Ainda Não Funcionar

1. **Verifique se o backend está rodando:**
   ```powershell
   netstat -ano | findstr ":3000"
   ```

2. **Teste localmente primeiro:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/public/company/services" -Headers @{"x-api-key"="AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13"} -UseBasicParsing
   ```

3. **Se funcionar localmente mas não no n8n:**
   - Use `host.docker.internal` ao invés de `172.19.64.1`
   - Ou configure `extra_hosts` no docker-compose do n8n

---

## ✅ Resumo

**Ação Necessária:**
1. No n8n, altere a URL de `localhost` para `172.19.64.1`
2. Mantenha o header `x-api-key`
3. Teste novamente

**URL Correta:**
```
http://172.19.64.1:3000/api/public/company/services
```





