# 🔧 Solução: n8n Não Consegue Conectar ao Backend

## ⚠️ Problema

O erro `ECONNREFUSED ::1:3000` indica que o n8n não consegue acessar o backend em `localhost:3000`.

**Possíveis causas:**
1. n8n está em Docker e não consegue acessar `localhost` da máquina host
2. Backend está escutando apenas em IPv4, mas n8n tenta IPv6 (`::1`)
3. Problema de rede/firewall

---

## ✅ Soluções

### **Solução 1: Usar IP da Máquina ao Invés de localhost**

Se o n8n está em Docker ou em outra máquina, use o IP da máquina host:

**No n8n, altere a URL:**
- ❌ `http://localhost:3000/api/public/appointments/available/...`
- ✅ `http://172.19.64.1:3000/api/public/appointments/available/...`
- ✅ `http://127.0.0.1:3000/api/public/appointments/available/...`

**Como descobrir o IP:**
```bash
# Windows PowerShell
ipconfig | findstr IPv4

# Ou use o IP que aparece no navegador quando acessa o frontend
# Exemplo: 172.19.64.1:8080 → use 172.19.64.1:3000
```

### **Solução 2: Se n8n está em Docker**

Use `host.docker.internal` ao invés de `localhost`:

**No n8n:**
- ✅ `http://host.docker.internal:3000/api/public/appointments/available/...`

### **Solução 3: Configurar Backend para Escutar em Todas as Interfaces**

O backend precisa escutar em `0.0.0.0` ao invés de apenas `localhost`:

**No arquivo `.env` do backend:**
```env
PORT=3000
HOST=0.0.0.0
```

**Ou modifique `backend/server.js`:**
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});
```

---

## 🔍 Verificar se Backend Está Acessível

### **Teste 1: Health Check Local**
```bash
curl http://localhost:3000/api/health
```

**Resposta esperada:**
```json
{"status":"ok","message":"Aevum API está funcionando"}
```

### **Teste 2: Health Check com IP**
```bash
curl http://127.0.0.1:3000/api/health
curl http://172.19.64.1:3000/api/health
```

### **Teste 3: Testar Rota com API Key**
```bash
curl -X GET \
  "http://localhost:3000/api/public/appointments/available/2026-02-12" \
  -H "x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344"
```

---

## 📋 Configuração Correta no n8n

### **Opção 1: Usar IP da Máquina**
```
URL: http://172.19.64.1:3000/api/public/appointments/available/{{ $json.date }}
Headers:
  x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
```

### **Opção 2: Se n8n está em Docker**
```
URL: http://host.docker.internal:3000/api/public/appointments/available/{{ $json.date }}
Headers:
  x-api-key: AEVUM_11_ce2e18558b4bef12f0b6c9d089297344
```

### **Opção 3: Usar Variável de Ambiente**
No n8n, configure uma variável de ambiente:
- **Nome:** `AEVUM_API_URL`
- **Valor:** `http://172.19.64.1:3000`

Depois use no HTTP Request:
```
URL: {{ $env.AEVUM_API_URL }}/api/public/appointments/available/{{ $json.date }}
```

---

## 🐛 Troubleshooting

### **Problema: "ECONNREFUSED ::1:3000"**

**Causa:** n8n tentando IPv6 (`::1`) mas backend só escuta IPv4.

**Solução:**
1. Use `127.0.0.1` ao invés de `localhost`
2. Ou configure backend para escutar em `0.0.0.0`

### **Problema: "ECONNREFUSED 127.0.0.1:3000"**

**Causa:** Backend não está rodando ou porta bloqueada.

**Solução:**
1. Verifique se backend está rodando: `netstat -ano | findstr :3000`
2. Reinicie o backend: `cd backend && npm start`
3. Verifique firewall/antivírus

### **Problema: n8n em Docker não acessa host**

**Causa:** Docker não consegue acessar `localhost` do host.

**Solução:**
1. Use `host.docker.internal` (Windows/Mac)
2. Ou use IP da máquina host
3. Ou configure Docker network corretamente

---

## ✅ Checklist

- [ ] Backend está rodando (verificar com `netstat`)
- [ ] Backend responde em `http://localhost:3000/api/health`
- [ ] Testou com curl primeiro
- [ ] URL no n8n usa IP correto (não `localhost` se n8n está em Docker)
- [ ] Header `x-api-key` está correto (sem dois pontos)
- [ ] API Key está completa e correta

---

## 🚀 Próximos Passos

1. **Descubra o IP da sua máquina:**
   ```powershell
   ipconfig | findstr IPv4
   ```

2. **Teste o backend diretamente:**
   ```bash
   curl http://SEU_IP:3000/api/health
   ```

3. **Configure n8n com o IP correto:**
   - Use o IP encontrado ao invés de `localhost`
   - Ou use `host.docker.internal` se n8n está em Docker

4. **Teste novamente no n8n**





