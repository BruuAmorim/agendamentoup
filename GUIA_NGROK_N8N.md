# 🌐 Guia de Configuração: ngrok + n8n

Este guia mostra como configurar o ngrok para expor o backend e usar no n8n.

## 📋 Pré-requisitos

1. **Backend rodando** em `http://localhost:3000`
2. **ngrok instalado** ([Download aqui](https://ngrok.com/download))
3. **Conta ngrok** (gratuita ou paga)

---

## 🚀 Passo 1: Instalar e Configurar ngrok

### Windows:
```bash
# Baixe o ngrok e extraia
# Adicione ao PATH ou use o caminho completo

# Ou use via Chocolatey:
choco install ngrok

# Ou baixe manualmente de: https://ngrok.com/download
```

### Autenticar ngrok:
```bash
# Obtenha seu token em: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken SEU_TOKEN_AQUI
```

---

## 🔧 Passo 2: Iniciar o ngrok

### Comando básico:
```bash
# Expor a porta 3000 (onde o backend está rodando)
ngrok http 3000
```

### Com domínio fixo (plano pago):
```bash
# Se você tem um domínio fixo no ngrok
ngrok http 3000 --domain=seu-dominio.ngrok-free.app
```

### Comando com mais opções:
```bash
# Com região específica (útil para latência)
ngrok http 3000 --region=sa  # South America

# Com interface web para monitoramento
ngrok http 3000 --web-addr=localhost:4040
```

---

## 📝 Passo 3: Obter a URL do ngrok

Após iniciar o ngrok, você verá algo assim:

```
Session Status                online
Account                       Seu Nome (Plan: Free)
Version                       3.x.x
Region                        South America (sa)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copie a URL:** `https://abc123.ngrok-free.app`

⚠️ **IMPORTANTE:** 
- A URL muda a cada vez que você reinicia o ngrok (plano gratuito)
- Para URL fixa, use o plano pago do ngrok
- Mantenha o ngrok rodando enquanto usar o n8n

---

## 🔗 Passo 4: Configurar URLs no n8n

### URLs da API Pública:

Substitua `https://abc123.ngrok-free.app` pela sua URL do ngrok:

#### 1. **Buscar Serviços da Empresa:**
```
URL: https://abc123.ngrok-free.app/api/public/company/services
Method: GET
Header: x-api-key: SUA_API_KEY_AQUI
```

#### 2. **Verificar Horários Disponíveis:**
```
URL: https://abc123.ngrok-free.app/api/public/appointments/available/{{$json.date}}
Method: GET
Header: x-api-key: SUA_API_KEY_AQUI
```

#### 3. **Criar Agendamento:**
```
URL: https://abc123.ngrok-free.app/api/public/appointments
Method: POST
Header: 
  - x-api-key: SUA_API_KEY_AQUI
  - Content-Type: application/json
Body:
{
  "customer_name": "{{$json.nome}}",
  "customer_phone": "{{$json.telefone}}",
  "appointment_date": "{{$json.data}}",
  "appointment_time": "{{$json.horario}}",
  "service": "{{$json.servico}}"
}
```

#### 4. **Listar Agendamentos:**
```
URL: https://abc123.ngrok-free.app/api/public/appointments?date={{$json.date}}
Method: GET
Header: x-api-key: SUA_API_KEY_AQUI
```

#### 5. **Atualizar Agendamento:**
```
URL: https://abc123.ngrok-free.app/api/public/appointments/{{$json.id}}
Method: PUT
Header: 
  - x-api-key: SUA_API_KEY_AQUI
  - Content-Type: application/json
Body:
{
  "customer_name": "{{$json.nome}}",
  "appointment_date": "{{$json.data}}",
  "appointment_time": "{{$json.horario}}"
}
```

#### 6. **Deletar Agendamento:**
```
URL: https://abc123.ngrok-free.app/api/public/appointments/{{$json.id}}
Method: DELETE
Header: x-api-key: SUA_API_KEY_AQUI
```

---

## ⚙️ Passo 5: Configurar Headers no n8n

### Header obrigatório em todas as requisições:

```
x-api-key: AEVUM_11_d3c2ac5ebd8278b5524a0142a666ba13
```

⚠️ **Substitua pela sua API Key real!**

### Como obter sua API Key:
1. Acesse o sistema como moderador/empresa
2. Vá em **Configurações** → **Integrações**
3. Gere ou copie sua API Key

---

## 🧪 Passo 6: Testar a Configuração

### Teste 1: Verificar se o backend está acessível via ngrok

```bash
# No terminal (ou Postman)
curl https://abc123.ngrok-free.app/api/health

# Deve retornar:
{
  "status": "OK",
  "timestamp": "...",
  "service": "Aevum API"
}
```

### Teste 2: Testar no n8n

1. Crie um workflow simples no n8n
2. Adicione um nó **HTTP Request**
3. Configure:
   - **URL:** `https://abc123.ngrok-free.app/api/public/company/services`
   - **Method:** GET
   - **Header:** `x-api-key: SUA_API_KEY`
4. Execute o workflow
5. Deve retornar os serviços da empresa

---

## 🔒 Passo 7: Segurança (Opcional mas Recomendado)

### 1. Adicionar autenticação básica no ngrok:

```bash
# Proteger o túnel com usuário e senha
ngrok http 3000 --basic-auth="usuario:senha"
```

### 2. Whitelist de IPs (plano pago):

Configure no dashboard do ngrok para permitir apenas IPs específicos.

### 3. Usar HTTPS sempre:

O ngrok já fornece HTTPS automaticamente, sempre use `https://` nas URLs.

---

## 📊 Monitoramento

### Interface Web do ngrok:

Acesse `http://localhost:4040` para ver:
- Requisições em tempo real
- Status do túnel
- Logs de requisições
- Estatísticas de uso

---

## ⚠️ Problemas Comuns

### 1. **Erro: "Tunnel not found"**
- Verifique se o ngrok está rodando
- Confirme que a porta 3000 está correta
- Reinicie o ngrok

### 2. **Erro: "Connection refused"**
- Verifique se o backend está rodando em `localhost:3000`
- Teste localmente: `curl http://localhost:3000/api/health`

### 3. **Erro: "Too many connections" (plano gratuito)**
- O plano gratuito tem limite de conexões simultâneas
- Considere o plano pago para produção

### 4. **URL muda a cada reinício (plano gratuito)**
- Use o plano pago para URL fixa
- Ou atualize as URLs no n8n manualmente

### 5. **Timeout nas requisições**
- Aumente o timeout no n8n (padrão: 30s)
- Verifique a latência no dashboard do ngrok

---

## 🎯 Vantagens do ngrok

✅ **Fácil configuração** - Sem necessidade de configurar portas/firewall  
✅ **HTTPS automático** - Certificado SSL incluído  
✅ **Acesso público** - Funciona de qualquer lugar  
✅ **Monitoramento** - Interface web para debug  
✅ **Sem configuração Docker** - Não precisa de `host.docker.internal`  

---

## 📚 Recursos Adicionais

- [Documentação oficial do ngrok](https://ngrok.com/docs)
- [Dashboard ngrok](https://dashboard.ngrok.com)
- [Guia de integração n8n](GUIA_N8N_CONFIGURACAO.md)

---

## 🔄 Atualizar URLs no n8n

Se a URL do ngrok mudar (plano gratuito), atualize em:

1. **Todos os nós HTTP Request** no n8n
2. **Variáveis de ambiente** (se configuradas)
3. **Webhooks** (se houver)

---

## 💡 Dica Pro

Para desenvolvimento, você pode criar um script que:
1. Inicia o backend
2. Inicia o ngrok
3. Atualiza automaticamente as URLs no n8n

Exemplo (PowerShell):
```powershell
# Iniciar backend
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "backend"

# Aguardar backend iniciar
Start-Sleep -Seconds 5

# Iniciar ngrok
Start-Process -FilePath "ngrok" -ArgumentList "http 3000"
```

---

**Pronto!** Agora você pode usar o ngrok para acessar o backend do n8n sem problemas de conectividade! 🚀



