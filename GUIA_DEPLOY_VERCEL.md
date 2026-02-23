# 🚀 Guia de Deploy do Backend no Vercel

## 📋 Pré-requisitos

1. ✅ Conta no [Vercel](https://vercel.com) (gratuita)
2. ✅ Projeto no GitHub/GitLab/Bitbucket
3. ✅ Banco de dados PostgreSQL configurado (Supabase, Render, etc.)
4. ✅ Variáveis de ambiente preparadas

---

## 🔧 Configuração Realizada

Os seguintes arquivos foram criados/modificados:

### ✅ Arquivos Criados:
- `api/index.js` - Entry point para Vercel Serverless Functions
- `vercel.json` - Configuração do Vercel
- `GUIA_DEPLOY_VERCEL.md` - Este guia

### ✅ Arquivos Modificados:
- `backend/server.js` - Adaptado para funcionar no Vercel (serverless)

---

## 📝 Passo a Passo do Deploy

### **1. Preparar Variáveis de Ambiente**

Antes do deploy, prepare as seguintes variáveis de ambiente:

```bash
# Banco de Dados
DATABASE_URL=postgresql://user:password@host:port/database

# Autenticação
JWT_SECRET=sua_chave_jwt_super_segura_aqui

# Ambiente
NODE_ENV=production

# Frontend (URL do seu frontend)
FRONTEND_URL=https://seu-frontend.vercel.app

# API Rate Limit (opcional)
API_RATE_LIMIT=100
```

### **2. Fazer Deploy via Vercel CLI**

#### **Instalar Vercel CLI:**
```bash
npm install -g vercel
```

#### **Login no Vercel:**
```bash
vercel login
```

#### **Deploy:**
```bash
# Na raiz do projeto
vercel

# Para produção
vercel --prod
```

### **3. Fazer Deploy via Dashboard do Vercel (Recomendado)**

#### **Passo 1: Conectar Repositório**
1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Conecte seu repositório GitHub/GitLab/Bitbucket
4. Selecione o repositório do projeto

#### **Passo 2: Configurar Projeto**
1. **Framework Preset:** Deixe em branco ou selecione "Other"
2. **Root Directory:** Deixe vazio (raiz do projeto)
3. **Build Command:** Deixe vazio (não precisa build)
4. **Output Directory:** Deixe vazio
5. **Install Command:** `npm install`

#### **Passo 3: Configurar Variáveis de Ambiente**
Na seção **"Environment Variables"**, adicione:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `DATABASE_URL` | `postgresql://...` | Production, Preview, Development |
| `JWT_SECRET` | `sua_chave_secreta` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production, Preview, Development |
| `FRONTEND_URL` | `https://seu-frontend.vercel.app` | Production, Preview, Development |
| `API_RATE_LIMIT` | `100` | Production, Preview, Development |
| `VERCEL` | `1` | Production, Preview, Development |

**⚠️ IMPORTANTE:** Marque todas as variáveis para **Production**, **Preview** e **Development**.

#### **Passo 4: Deploy**
1. Clique em **"Deploy"**
2. Aguarde o build (pode demorar alguns minutos na primeira vez)
3. Após o deploy, você receberá uma URL como: `https://seu-projeto.vercel.app`

---

## 🔍 Verificar Deploy

### **1. Testar Health Check:**
```bash
curl https://seu-projeto.vercel.app/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "message": "Aevum API está funcionando",
  "version": "...",
  "timestamp": "..."
}
```

### **2. Testar Endpoint de Autenticação:**
```bash
curl -X POST https://seu-projeto.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}'
```

---

## ⚙️ Configurações Importantes

### **1. Timeout do Vercel**
- **Plano Gratuito:** 10 segundos por função
- **Plano Pro:** 60 segundos por função
- **Plano Enterprise:** Até 300 segundos

**⚠️ Se suas requisições demorarem mais que 10s, considere:**
- Otimizar queries do banco
- Usar cache
- Upgrade para plano Pro

### **2. Cold Starts**
- Primeira requisição pode demorar 2-5 segundos
- Conexões com banco são reutilizadas entre requisições
- Considere usar **Vercel Pro** para melhor performance

### **3. Limites do Plano Gratuito**
- ✅ 100GB de bandwidth/mês
- ✅ 100 horas de execução/mês
- ✅ 10 segundos de timeout
- ✅ Deploys ilimitados

---

## 🔄 Atualizar Frontend

Após o deploy, atualize o frontend para usar a nova URL:

### **Opção 1: Atualizar `config-api.js`**
```javascript
// frontend/js/config-api.js
if (isVercel || isFirebase) {
  const productionApiUrl = 'https://seu-backend.vercel.app/api';
  console.log('🔧 Detectado ambiente de produção - usando API:', productionApiUrl);
  return productionApiUrl;
}
```

### **Opção 2: Variável de Ambiente no Frontend**
Se o frontend também estiver no Vercel, use variável de ambiente:
```javascript
const productionApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://seu-backend.vercel.app/api';
```

---

## 🐛 Troubleshooting

### **Erro: "Cannot find module"**
**Solução:** Verifique se todas as dependências estão no `package.json` e que o `npm install` foi executado.

### **Erro: "Database connection failed"**
**Solução:** 
1. Verifique se `DATABASE_URL` está configurada corretamente
2. Verifique se o banco aceita conexões externas
3. No Supabase, vá em **Settings > Database > Connection Pooling**

### **Erro: "Function timeout"**
**Solução:**
1. Otimize queries do banco
2. Adicione índices nas tabelas
3. Considere upgrade para Vercel Pro

### **Erro: "CORS"**
**Solução:** O backend já está configurado para aceitar requisições do Vercel. Verifique se `FRONTEND_URL` está correta.

### **Cold Start Muito Lento**
**Solução:**
1. Use Vercel Pro (melhor performance)
2. Considere manter uma função "quente" com health checks periódicos
3. Use connection pooling no banco (Supabase oferece isso)

---

## 📊 Monitoramento

### **Logs do Vercel:**
1. Acesse o dashboard do Vercel
2. Vá em **"Deployments"**
3. Clique no deployment
4. Vá em **"Functions"** para ver logs

### **Métricas:**
- **Function Invocations:** Número de requisições
- **Function Duration:** Tempo de execução
- **Function Errors:** Erros ocorridos

---

## 🔐 Segurança

### **1. Variáveis de Ambiente**
- ✅ Nunca commite variáveis de ambiente no código
- ✅ Use o painel do Vercel para configurar
- ✅ Rotacione `JWT_SECRET` periodicamente

### **2. Rate Limiting**
- ✅ Já configurado no código (100 req/15min por padrão)
- ✅ Ajuste `API_RATE_LIMIT` conforme necessário

### **3. CORS**
- ✅ Já configurado para aceitar apenas origens permitidas
- ✅ Adicione novas origens em `backend/server.js` se necessário

---

## 🚀 Próximos Passos

1. ✅ Testar todos os endpoints
2. ✅ Configurar domínio customizado (opcional)
3. ✅ Configurar monitoramento (opcional)
4. ✅ Atualizar frontend com nova URL
5. ✅ Configurar CI/CD (deploy automático)

---

## 📚 Recursos Úteis

- [Documentação do Vercel](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

## ✅ Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Health check funcionando
- [ ] Teste de login funcionando
- [ ] Frontend atualizado com nova URL
- [ ] Logs sendo monitorados
- [ ] Domínio customizado configurado (opcional)

---

**🎉 Pronto! Seu backend está no ar!**

Se tiver algum problema, verifique os logs no dashboard do Vercel ou entre em contato.

