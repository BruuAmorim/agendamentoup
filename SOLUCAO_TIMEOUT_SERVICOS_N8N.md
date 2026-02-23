# 🔧 Solução: ETIMEDOUT ao Buscar Serviços no n8n

## ⚠️ Problema

Erro: `connect ETIMEDOUT 172.19.64.1:3000`

**Causa:** O IP `172.19.64.1` não está acessível do Docker, ou há bloqueio de firewall/rede.

---

## ✅ Solução 1: Usar IP Correto da Máquina Host

### **1. Descobrir o IP correto:**

**No PowerShell:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object IPAddress, InterfaceAlias
```

**Use o IP que aparece na sua interface de rede principal (geralmente Wi-Fi ou Ethernet).**

### **2. No n8n, altere a URL para:**

```
http://SEU_IP_CORRETO:3000/api/public/company/services
```

**Exemplo:**
```
http://192.168.1.56:3000/api/public/company/services
```

---

## ✅ Solução 2: Configurar Firewall do Windows

### **Permitir conexões na porta 3000:**

**No PowerShell (como Administrador):**
```powershell
New-NetFirewallRule -DisplayName "Aevum API Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**Ou via Interface Gráfica:**
1. Abra "Firewall do Windows Defender"
2. Clique em "Configurações Avançadas"
3. Clique em "Regras de Entrada" > "Nova Regra"
4. Selecione "Porta" > "TCP" > "Portas locais específicas: 3000"
5. Selecione "Permitir a conexão"
6. Aplique a todas as redes
7. Nome: "Aevum API Port 3000"

---

## ✅ Solução 3: Usar host.docker.internal (Após Configurar)

### **1. Configure extra_hosts no docker-compose do n8n:**

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
    volumes:
      - n8n_data:/home/node/.n8n
    # CRÍTICO: Permite acesso ao host.docker.internal
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - n8n_network

volumes:
  n8n_data:

networks:
  n8n_network:
    driver: bridge
```

### **2. Reinicie o n8n:**

```bash
docker-compose -f docker-compose.n8n.yml down
docker-compose -f docker-compose.n8n.yml up -d
```

### **3. No n8n, use:**

```
http://host.docker.internal:3000/api/public/company/services
```

---

## ✅ Solução 4: Usar network_mode: "host" (Linux)

**Se você estiver no Linux, pode usar:**

```yaml
services:
  n8n:
    network_mode: "host"
    # ... resto da configuração
```

**E então usar `localhost` diretamente:**

```
http://localhost:3000/api/public/company/services
```

---

## 📋 Configuração Recomendada no n8n

### **HTTP Request Node - buscar_servicos:**

**Method:** `GET`

**URL:** 
```
http://192.168.1.56:3000/api/public/company/services
```
*(Substitua pelo IP correto da sua máquina)*

**Headers:**
- **Name:** `x-api-key`
- **Value:** `AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13`

**Settings:**
- **Timeout:** `60000` (60 segundos)
- **Retry on Fail:** ✅ Ativado
- **Max Tries:** `3`
- **Retry Delay:** `1000` (1 segundo)

---

## 🔍 Verificar se o Backend Está Acessível

### **Teste 1: Localhost (da máquina host)**

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

**Deve retornar:** `StatusCode: 200`

### **Teste 2: IP da máquina (do próprio host)**

```powershell
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress
Invoke-WebRequest -Uri "http://$ip:3000/api/health" -UseBasicParsing
```

**Deve retornar:** `StatusCode: 200`

### **Teste 3: De dentro do container n8n**

```bash
docker exec -it n8n curl http://host.docker.internal:3000/api/health
```

**OU:**

```bash
docker exec -it n8n curl http://172.19.64.1:3000/api/health
```

---

## 🐛 Troubleshooting

### **Se ainda não funcionar:**

1. **Verifique se o backend está rodando:**
   ```powershell
   netstat -ano | findstr :3000
   ```
   **Deve mostrar:** `TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING`

2. **Verifique se o backend está escutando em 0.0.0.0:**
   - O backend deve estar configurado para escutar em `0.0.0.0` (todas as interfaces)
   - Verifique em `backend/server.js`: `app.listen(PORT, '0.0.0.0', ...)`

3. **Teste com curl do Docker:**
   ```bash
   docker run --rm curlimages/curl curl -v http://host.docker.internal:3000/api/health
   ```

4. **Verifique logs do backend:**
   - Veja se há erros ao iniciar
   - Veja se há requisições chegando (mesmo que falhem)

5. **Desative temporariamente o firewall para teste:**
   ```powershell
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
   ```
   **⚠️ ATENÇÃO:** Reative após o teste!

---

## ✅ Checklist

- [ ] Backend está rodando e escutando em `0.0.0.0:3000`
- [ ] Firewall permite conexões na porta 3000
- [ ] IP correto identificado e testado localmente
- [ ] URL no n8n usa o IP correto ou `host.docker.internal` (após configurar)
- [ ] `extra_hosts` configurado no docker-compose (se usar `host.docker.internal`)
- [ ] Timeout configurado para 60 segundos no n8n
- [ ] "Retry on Fail" ativado no n8n
- [ ] Header `x-api-key` está correto

---

## 🚀 Solução Rápida (Recomendada)

**1. Descubra seu IP:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object IPAddress
```

**2. Configure firewall:**
```powershell
New-NetFirewallRule -DisplayName "Aevum API Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**3. No n8n, use:**
```
http://SEU_IP:3000/api/public/company/services
```

**4. Headers:**
```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

**5. Settings:**
- Timeout: `60000`
- Retry on Fail: ✅

---

## 📝 Resumo

**URLs para Testar (nesta ordem):**

1. ✅ `http://192.168.1.56:3000/api/public/company/services` (IP da sua rede local)
2. ✅ `http://host.docker.internal:3000/api/public/company/services` (Após configurar extra_hosts)
3. ⚠️ `http://172.19.64.1:3000/api/public/company/services` (Pode não funcionar dependendo da configuração Docker)

**Header:**
```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

**Settings:**
- Timeout: `60000`
- Retry on Fail: ✅
- Max Tries: `3`
