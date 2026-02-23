# 🔧 Solução: ENOTFOUND host.docker.internal no n8n

## ⚠️ Problema

Erro: `getaddrinfo ENOTFOUND host.docker.internal`

**Causa:** O n8n está em Docker, mas o Docker não consegue resolver `host.docker.internal` porque:
- Está rodando em Linux (que não suporta nativamente)
- Ou o `extra_hosts` não está configurado no docker-compose

---

## ✅ Soluções

### **Solução 1: Adicionar extra_hosts no docker-compose (Recomendado)**

Se você está usando `docker-compose`, adicione ao arquivo:

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    # ... outras configurações ...
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**Arquivo completo:** `docker-compose.n8n.yml` (criado para você)

**Depois, reinicie o n8n:**
```bash
docker-compose -f docker-compose.n8n.yml down
docker-compose -f docker-compose.n8n.yml up -d
```

---

### **Solução 2: Usar IP da Máquina Host Diretamente (Mais Simples)**

**Se você não quer modificar o docker-compose, use o IP diretamente:**

**URLs corretas para usar no n8n:**

#### **Opção A: IP 172.19.64.1 (Recomendado)**
```
http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
```

#### **Opção B: IP 192.168.1.56 (Alternativa)**
```
http://192.168.1.56:3000/api/public/appointments/available/{{ $json.date }}
```

**Vantagem:** Funciona imediatamente, sem modificar Docker.

**Desvantagem:** Se o IP mudar, precisa atualizar.

---

### **Solução 3: Para Linux (Se extra_hosts não funcionar)**

Se estiver em Linux e `host.docker.internal` não funcionar mesmo com `extra_hosts`:

**Opção 1: Usar IP do gateway do Docker**
```bash
# Descobrir o IP do gateway
docker network inspect bridge | grep Gateway
```

**Opção 2: Usar network_mode: host**
```yaml
services:
  n8n:
    network_mode: "host"
    # Remove a seção ports (não é necessária com host mode)
```

**Depois use:**
```
http://localhost:3000/api/public/appointments/available/{{ $json.date }}
```

---

## 📋 URLs Corretas para n8n

### **GET Slots Disponíveis**
```
http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
```

### **POST Criar Agendamento**
```
http://172.19.64.1:3000/api/public/appointments
```

### **PUT Atualizar Agendamento**
```
http://172.19.64.1:3000/api/public/appointments/{{ $json.appointment_id }}
```

### **DELETE Deletar Agendamento**
```
http://172.19.64.1:3000/api/public/appointments/{{ $json.appointment_id }}
```

**Headers (todas as rotas):**
```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

---

## 🔍 Garantir que {{ $json.date }} Existe

### **Problema:** Variável `$json.date` pode não estar definida

### **Solução: Adicionar Nó "Set" Antes do HTTP Request**

**No n8n, adicione um nó "Set" entre o nó anterior e o HTTP Request:**

1. **Nó "Set" (ou "Edit Fields")**
   - **Name:** `Preparar Data`
   - **Configuração:**
     ```
     date: {{ $json.date || $json.appointment_date || $now.toISOString().split('T')[0] }}
     ```
   
   **Ou se a data vem em outro formato:**
   ```javascript
   // No Code node antes do HTTP Request
   const inputDate = $json.date || $json.appointment_date;
   let formattedDate;
   
   if (inputDate) {
     // Se já está em formato YYYY-MM-DD
     if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
       formattedDate = inputDate;
     } else {
       // Converter para YYYY-MM-DD
       const date = new Date(inputDate);
       formattedDate = date.toISOString().split('T')[0];
     }
   } else {
     // Usar data de hoje como padrão
     formattedDate = new Date().toISOString().split('T')[0];
   }
   
   return {
     ...$json,
     date: formattedDate
   };
   ```

2. **HTTP Request** (depois do Set)
   - **URL:** `http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}`

---

## 📝 Exemplo Completo de Workflow

### **Fluxo Recomendado:**

1. **Webhook** (recebe dados)
   ```json
   {
     "phone": "551637063159",
     "message": "Ola",
     "contactId": "153855"
   }
   ```

2. **Normalize Input** (já existe)

3. **Set** (preparar data) ← **ADICIONAR ESTE NÓ**
   ```json
   {
     "date": "{{ $json.date || $now.toISOString().split('T')[0] }}",
     "phone": "{{ $json.phone }}",
     "message": "{{ $json.message }}"
   }
   ```

4. **GET Slots** (HTTP Request)
   - **URL:** `http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}`
   - **Headers:**
     - `x-api-key`: `AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13`

5. **Próximos nós...**

---

## ✅ Resumo Final

### **1. URL Correta para Usar:**
```
http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
```

### **2. Docker-compose (Opcional - se quiser usar host.docker.internal):**
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**Arquivo completo:** `docker-compose.n8n.yml`

### **3. Garantir Variável date:**
Adicione um nó "Set" antes do HTTP Request:
```json
{
  "date": "{{ $json.date || $now.toISOString().split('T')[0] }}"
}
```

---

## 🚀 Próximos Passos

1. **Use o IP diretamente** (mais simples):
   - Altere todas as URLs de `host.docker.internal` para `172.19.64.1`

2. **Ou configure extra_hosts** (se preferir):
   - Adicione `extra_hosts` no docker-compose
   - Reinicie o n8n

3. **Adicione nó "Set"** para garantir que `date` existe

4. **Teste novamente**

---

## 🔍 Verificação

Após aplicar as mudanças, teste:

1. **No n8n, execute o workflow**
2. **Verifique os logs do backend** (deve aparecer a requisição)
3. **Se ainda der erro, verifique:**
   - Backend está rodando? (`netstat -ano | findstr :3000`)
   - IP está correto? (`ipconfig`)
   - Variável `date` existe? (verifique o output do nó anterior)





