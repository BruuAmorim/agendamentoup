# 🔧 Solução: Timeout no n8n - ETIMEDOUT

## ⚠️ Problema

Erro: `connect ETIMEDOUT 172.19.64.1:3000`

O backend está funcionando, mas o n8n não consegue conectar.

---

## ✅ Soluções

### **Solução 1: Se n8n está em Docker (Mais Comum)**

Se o n8n está rodando em Docker, use `host.docker.internal` ao invés do IP:

**No n8n, altere a URL:**
- ❌ `http://172.19.64.1:3000/api/public/appointments/available/...`
- ✅ `http://host.docker.internal:3000/api/public/appointments/available/...`

**Para Windows/Mac:**
```
http://host.docker.internal:3000/api/public/appointments/available/{{ $json.date }}
```

**Para Linux:**
Se `host.docker.internal` não funcionar no Linux, use:
```
http://172.17.0.1:3000/api/public/appointments/available/{{ $json.date }}
```

---

### **Solução 2: Aumentar Timeout no n8n**

O timeout padrão pode ser muito curto. Configure no n8n:

1. **No nó HTTP Request, vá para "Settings"**
2. **Configure:**
   - **Timeout:** `30000` (30 segundos)
   - **Retry on Fail:** Ative esta opção
   - **Max Tries:** `3`

---

### **Solução 3: Verificar Firewall**

O Windows Firewall pode estar bloqueando conexões:

1. **Abra o Firewall do Windows**
2. **Permita conexões na porta 3000:**
   ```powershell
   New-NetFirewallRule -DisplayName "Aevum API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

---

### **Solução 4: Usar ngrok (Para Testes)**

Se nada funcionar, use ngrok para expor o backend:

1. **Instale ngrok:**
   ```bash
   # Download: https://ngrok.com/download
   ```

2. **Exponha a porta 3000:**
   ```bash
   ngrok http 3000
   ```

3. **Use a URL do ngrok no n8n:**
   ```
   https://seu-subdominio.ngrok.io/api/public/appointments/available/...
   ```

---

### **Solução 5: Verificar Rede do Docker**

Se n8n está em Docker, verifique a rede:

```bash
# Verificar se Docker consegue acessar o host
docker exec -it n8n_container ping 172.19.64.1

# Se não funcionar, use host.docker.internal
docker exec -it n8n_container ping host.docker.internal
```

---

## 🔍 Teste de Conectividade

### **Teste 1: Do n8n para o Backend**

Se o n8n tem acesso a terminal, teste:

```bash
# Dentro do container n8n
curl http://host.docker.internal:3000/api/health
# ou
curl http://172.19.64.1:3000/api/health
```

### **Teste 2: Do Host para o Backend**

```powershell
# No PowerShell da máquina host
Invoke-WebRequest -Uri "http://172.19.64.1:3000/api/health"
Invoke-WebRequest -Uri "http://localhost:3000/api/health"
```

Ambos devem funcionar se o backend está rodando.

---

## 📋 Configuração Recomendada no n8n

### **Opção 1: host.docker.internal (Recomendado para Docker)**

```
URL: http://host.docker.internal:3000/api/public/appointments/available/{{ $json.date }}
Headers:
  x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
Settings:
  Timeout: 30000
  Retry on Fail: ✅
  Max Tries: 3
```

### **Opção 2: IP da Máquina (Se n8n não está em Docker)**

```
URL: http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
Headers:
  x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
Settings:
  Timeout: 30000
  Retry on Fail: ✅
```

### **Opção 3: ngrok (Para Testes Externos)**

```
URL: https://seu-subdominio.ngrok.io/api/public/appointments/available/{{ $json.date }}
Headers:
  x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

---

## 🐛 Troubleshooting Passo a Passo

### **Passo 1: Verificar Backend**

```powershell
# Deve retornar {"status":"ok",...}
Invoke-WebRequest -Uri "http://localhost:3000/api/health"
Invoke-WebRequest -Uri "http://172.19.64.1:3000/api/health"
```

### **Passo 2: Verificar Porta**

```powershell
# Deve mostrar LISTENING na porta 3000
netstat -ano | findstr ":3000"
```

### **Passo 3: Testar com curl (se disponível)**

```bash
curl -X GET \
  "http://172.19.64.1:3000/api/public/appointments/available/2026-02-12" \
  -H "x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13"
```

### **Passo 4: Verificar Logs do Backend**

Quando fizer a requisição do n8n, verifique os logs do backend:
- Se aparecer a requisição nos logs → Backend recebeu, problema no n8n
- Se não aparecer → Problema de rede/conectividade

---

## ✅ Checklist

- [ ] Backend está rodando (verificar com `netstat`)
- [ ] Backend responde em `localhost:3000`
- [ ] Backend responde em `172.19.64.1:3000`
- [ ] Se n8n está em Docker, use `host.docker.internal`
- [ ] Timeout configurado para 30 segundos no n8n
- [ ] "Retry on Fail" ativado no n8n
- [ ] Firewall permite conexões na porta 3000
- [ ] Testou com curl primeiro

---

## 🚀 Solução Rápida

**Se o n8n está em Docker, use:**

```
http://host.docker.internal:3000/api/public/appointments/available/{{ $json.date }}
```

**Se o n8n não está em Docker, use:**

```
http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
```

**E configure no Settings do nó HTTP Request:**
- Timeout: `30000`
- Retry on Fail: ✅ Ativado





