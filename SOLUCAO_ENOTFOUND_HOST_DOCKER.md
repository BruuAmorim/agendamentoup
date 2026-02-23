# 🔧 Solução: ENOTFOUND host.docker.internal

## ⚠️ Problema

Erro: `getaddrinfo ENOTFOUND host.docker.internal`

**Causa:** O Docker não consegue resolver `host.docker.internal`. Isso acontece quando:
1. O `extra_hosts` não está configurado no docker-compose
2. O n8n está em Linux (onde `host.docker.internal` não funciona nativamente)
3. O docker-compose não foi reiniciado após adicionar `extra_hosts`

---

## ✅ Solução Rápida: Usar IP Diretamente

**A solução mais simples é usar o IP da máquina diretamente:**

### **No n8n, altere a URL para:**

```
http://172.19.64.1:3000/api/public/company/services
```

**OU use o IP alternativo:**

```
http://192.168.1.56:3000/api/public/company/services
```

---

## ✅ Solução Alternativa: Configurar extra_hosts

Se você preferir usar `host.docker.internal`, configure no docker-compose do n8n:

### **1. Edite o docker-compose do n8n:**

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

### **3. Teste novamente no n8n:**

Use a URL:
```
http://host.docker.internal:3000/api/public/company/services
```

---

## 📋 Configuração Recomendada no n8n

### **Opção 1: IP Direto (Mais Simples - Recomendado)**

**URL:**
```
http://172.19.64.1:3000/api/public/company/services
```

**Headers:**
- **Name:** `x-api-key`
- **Value:** `AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13`

**Settings:**
- **Timeout:** `60000` (60 segundos)
- **Retry on Fail:** ✅ Ativado

### **Opção 2: host.docker.internal (Após Configurar extra_hosts)**

**URL:**
```
http://host.docker.internal:3000/api/public/company/services
```

**Headers:**
- **Name:** `x-api-key`
- **Value:** `AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13`

---

## 🔍 Verificar IPs Disponíveis

**No PowerShell:**
```powershell
ipconfig | findstr /i "IPv4"
```

**Use o IP que aparece primeiro (geralmente o mais específico).**

---

## 🐛 Troubleshooting

### **Se o IP não funcionar:**

1. **Verifique se o backend está acessível:**
   ```powershell
   Invoke-WebRequest -Uri "http://172.19.64.1:3000/api/health" -UseBasicParsing
   ```

2. **Verifique firewall:**
   ```powershell
   New-NetFirewallRule -DisplayName "Aevum API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

3. **Teste de dentro do container n8n:**
   ```bash
   docker exec -it n8n ping 172.19.64.1
   ```

---

## ✅ Checklist

- [ ] URL no n8n usa IP direto (`172.19.64.1`) ou `host.docker.internal` (após configurar)
- [ ] Se usar `host.docker.internal`, `extra_hosts` está configurado
- [ ] Docker-compose foi reiniciado após adicionar `extra_hosts`
- [ ] Backend está rodando e acessível
- [ ] Firewall permite conexões na porta 3000
- [ ] Timeout configurado para 60 segundos
- [ ] "Retry on Fail" ativado

---

## 🚀 Solução Rápida (Recomendada)

**Use o IP diretamente - é mais simples e funciona imediatamente:**

1. **No n8n, altere a URL para:**
   ```
   http://172.19.64.1:3000/api/public/company/services
   ```

2. **Mantenha o header:**
   ```
   x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
   ```

3. **Teste novamente**

---

## 📝 Resumo

**URLs para Testar (nesta ordem):**

1. ✅ `http://172.19.64.1:3000/api/public/company/services` (Mais simples)
2. ✅ `http://192.168.1.56:3000/api/public/company/services` (Alternativa)
3. ⚙️ `http://host.docker.internal:3000/api/public/company/services` (Após configurar extra_hosts)

**Header:**
```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

**Settings:**
- Timeout: `60000`
- Retry on Fail: ✅





