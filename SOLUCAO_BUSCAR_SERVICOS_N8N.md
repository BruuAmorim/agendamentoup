# 🔧 Solução: Não Está Conectando ao Buscar Serviços no n8n

## ✅ Status Atual

- ✅ Backend está rodando e funcionando
- ✅ Rota `/api/public/company/services` está funcionando
- ✅ API Key está válida
- ❌ n8n não consegue conectar (ETIMEDOUT)

---

## 🎯 Solução Rápida

### **Opção 1: Usar host.docker.internal (Recomendado)**

**1. Verifique se o docker-compose do n8n tem `extra_hosts` configurado:**

O arquivo `docker-compose.n8n.yml` já está configurado corretamente com:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**2. Reinicie o n8n para aplicar a configuração:**

```bash
docker-compose -f docker-compose.n8n.yml down
docker-compose -f docker-compose.n8n.yml up -d
```

**3. No n8n, altere a URL para:**

```
http://host.docker.internal:3000/api/public/company/services
```

---

### **Opção 2: Usar IP da Rede Wi-Fi (Alternativa)**

**No n8n, use o IP da sua rede Wi-Fi:**

```
http://192.168.1.162:3000/api/public/company/services
```

**⚠️ Nota:** Este IP pode mudar se você reconectar à rede Wi-Fi.

---

## 📋 Configuração Completa no n8n

### **HTTP Request Node - buscar_servicos:**

**Method:** `GET`

**URL:** 
```
http://host.docker.internal:3000/api/public/company/services
```

**Headers:**
- **Name:** `x-api-key`
- **Value:** `AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13`

**Settings:**
- **Timeout:** `60000` (60 segundos)
- **Retry on Fail:** ✅ Ativado
- **Max Tries:** `3`
- **Retry Delay:** `1000` (1 segundo)

---

## 🔍 Verificar Configuração

### **1. Teste se o backend está acessível:**

**Do PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/public/company/services" -Headers @{"x-api-key"="AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13"} -UseBasicParsing
```

**Deve retornar:**
```json
{
  "success": true,
  "data": {
    "company_name": "Mumu estetica",
    "services": ["peeling", "limpeza de pele"]
  }
}
```

### **2. Teste de dentro do container n8n:**

```bash
docker exec -it n8n curl -H "x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13" http://host.docker.internal:3000/api/public/company/services
```

**OU:**

```bash
docker exec -it n8n curl -H "x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13" http://192.168.1.162:3000/api/public/company/services
```

---

## 🐛 Troubleshooting

### **Se `host.docker.internal` não funcionar:**

1. **Verifique se o n8n foi reiniciado após adicionar `extra_hosts`:**
   ```bash
   docker-compose -f docker-compose.n8n.yml down
   docker-compose -f docker-compose.n8n.yml up -d
   ```

2. **Verifique os logs do n8n:**
   ```bash
   docker logs n8n
   ```

3. **Teste com o IP direto:**
   ```
   http://192.168.1.162:3000/api/public/company/services
   ```

### **Se ainda não funcionar:**

1. **Verifique firewall:**
   ```powershell
   New-NetFirewallRule -DisplayName "Aevum API Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

2. **Verifique se o backend está escutando em 0.0.0.0:**
   - O backend já está configurado corretamente em `backend/server.js`
   - Deve estar escutando em `0.0.0.0:3000`

3. **Verifique se a porta 3000 está aberta:**
   ```powershell
   netstat -ano | findstr :3000
   ```
   **Deve mostrar:** `TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING`

---

## ✅ Checklist Final

- [ ] Docker-compose do n8n tem `extra_hosts` configurado
- [ ] n8n foi reiniciado após configurar `extra_hosts`
- [ ] URL no n8n usa `host.docker.internal` ou IP correto (`192.168.1.162`)
- [ ] Header `x-api-key` está correto
- [ ] Timeout configurado para 60 segundos
- [ ] "Retry on Fail" ativado
- [ ] Firewall permite conexões na porta 3000
- [ ] Backend está rodando e escutando em `0.0.0.0:3000`

---

## 🚀 Passos para Resolver Agora

**1. Reinicie o n8n:**
```bash
docker-compose -f docker-compose.n8n.yml down
docker-compose -f docker-compose.n8n.yml up -d
```

**2. No n8n, altere a URL para:**
```
http://host.docker.internal:3000/api/public/company/services
```

**3. Configure os Settings:**
- Timeout: `60000`
- Retry on Fail: ✅

**4. Teste novamente!**

---

## 📝 Resumo das URLs

**URLs para usar no n8n (nesta ordem de preferência):**

1. ✅ `http://host.docker.internal:3000/api/public/company/services` (Após reiniciar n8n)
2. ✅ `http://192.168.1.162:3000/api/public/company/services` (IP da rede Wi-Fi)
3. ⚠️ `http://172.30.64.1:3000/api/public/company/services` (IP Docker - pode não funcionar)
4. ❌ `http://172.19.64.1:3000/api/public/company/services` (IP incorreto - não usar)

**Header obrigatório:**
```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```
