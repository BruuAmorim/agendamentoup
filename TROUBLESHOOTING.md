# 🔧 Troubleshooting - EvAgendamento

## Erro "Failed to fetch" ao Criar Agendamento

Este guia ajuda a resolver o erro "Failed to fetch" que ocorre quando o frontend não consegue se comunicar com a API.

## 🚨 Sintomas

- Erro "Failed to fetch" no console do navegador
- Toast vermelho: "Erro de conexão com o servidor"
- Agendamentos não são criados
- Interface parece funcionar, mas não salva dados

## 🔍 Diagnóstico Rápido

### 1. Verificar se o Servidor Está Rodando

Abra um terminal e execute:

```bash
# No Windows PowerShell
netstat -ano | findstr :3000

# Ou verifique se há processos node rodando
tasklist | findstr node
```

**Resultado esperado:**
- Porta 3000 deve estar LISTENING
- Deve haver um processo node.exe rodando

### 2. Testar Conectividade Básica

Abra `http://localhost:3000/health` no navegador.

**Resultado esperado:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-XX...",
  "service": "EvAgendamento API"
}
```

### 3. Usar a Página de Diagnóstico

Abra `frontend/diagnostico.html` no navegador e execute o diagnóstico completo.

## 🛠️ Soluções

### Solução 1: Iniciar o Servidor da API

```bash
# Navegar para o diretório do projeto
cd C:\Users\Bruna\Documents\Agendamento

# Instalar dependências (se necessário)
npm install

# Iniciar o servidor
npm start
```

**Resultado esperado no terminal:**
```
🚀 EvAgendamento API rodando na porta 3000
📊 Ambiente: development
🔗 Health check: http://localhost:3000/health
💾 Dados armazenados em memória (sem banco de dados)
```

### Solução 2: Verificar Porta Bloqueada

Se a porta 3000 estiver ocupada:

1. **Matar processo na porta 3000:**
```bash
# Encontrar PID do processo
netstat -ano | findstr :3000

# Matar processo (substitua XXXX pelo PID)
taskkill /PID XXXX /F
```

2. **Ou mudar a porta da API:**
   - Edite `server.js`
   - Mude `const PORT = process.env.PORT || 3000;` para outra porta
   - Atualize a URL no `frontend/js/api.js`

### Solução 3: Problemas de CORS

Se aparecer erro relacionado a CORS:

1. **Verifique a configuração CORS em `server.js`:**
```javascript
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    // ... resto da configuração
  },
  credentials: true
}));
```

2. **Se estiver abrindo como arquivo local (`file://`):**
   - Use um servidor local como Live Server do VS Code
   - Ou use `python -m http.server 3001` na pasta frontend

### Solução 4: Firewall/Proxy

1. **Desabilitar firewall temporariamente:**
   - Configurações do Windows → Atualização e Segurança → Firewall
   - Desabilitar temporariamente

2. **Verificar proxy:**
   - Se estiver em rede corporativa, pode haver proxy bloqueando
   - Teste em outra rede Wi-Fi

## 🧪 Teste de Funcionamento

### Teste Manual

1. **Abrir aplicação:** `frontend/index.html`
2. **Preencher formulário:**
   - Nome: João Teste
   - Telefone: (11) 99999-9999
   - Data: Uma data futura
   - Clicar "Verificar Disponibilidade"
   - Selecionar um horário
   - Clicar "Criar Agendamento"

3. **Verificar resultado:**
   - Deve aparecer toast verde: "Agendamento criado com sucesso!"
   - Deve aparecer na lista de agendamentos

### Teste com cURL

```bash
# Testar health check
curl http://localhost:3000/health

# Testar criação de agendamento
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Teste cURL",
    "customer_phone": "(11) 99999-9999",
    "appointment_date": "AMANHA", # Substitua por uma data futura como "2026-01-26"
    "appointment_time": "14:00",
    "duration_minutes": 60
  }'
```

## 📊 Logs de Debug

### Console do Navegador (F12)

Procure por estas mensagens:
- ✅ `Conexão com API estabelecida`
- ❌ `Erro na requisição POST`
- 🔄 `Fazendo requisição: POST http://localhost:3000/api/appointments`

### Terminal do Servidor

Procure por:
- `POST /api/appointments 201` (sucesso)
- `POST /api/appointments 400` (dados inválidos)
- `POST /api/appointments 500` (erro interno)

## 🚑 Soluções Avançadas

### 1. Resetar Configurações

```bash
# Limpar cache do navegador
# Ctrl+Shift+R (hard refresh)

# Limpar localStorage
# Console: localStorage.clear()
```

### 2. Verificar Dependências

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### 3. Verificar Versão Node.js

```bash
node --version
# Deve ser 14+ para suporte ES6
```

### 4. Teste em Outro Navegador

- Chrome/Chromium
- Firefox
- Edge

## 📞 Ainda com Problemas?

Se nenhuma solução funcionou:

1. **Execute o diagnóstico completo:** `frontend/diagnostico.html`
2. **Cole o resultado dos testes** neste documento
3. **Verifique os logs do console** do navegador
4. **Verifique os logs do terminal** onde o servidor está rodando

### Informações Úteis para Suporte

- **Sistema Operacional:** Windows 10/11
- **Navegador:** Chrome/Firefox/Edge
- **Versão Node.js:** `node --version`
- **Resultado do diagnóstico:** [colar aqui]
- **Logs do console:** [colar logs relevantes]
- **Logs do servidor:** [colar logs relevantes]

---

💡 **Dica:** Sempre inicie o servidor com `npm start` antes de usar a aplicação!
