# Guia de Deploy - Aevum

## 📋 Visão Geral

Este guia explica como fazer deploy do backend e configurar o frontend para funcionar em produção, mantendo um ambiente local para testes.

## 🏗️ Arquitetura

- **Frontend**: Firebase Hosting (https://aevum-cdc32.web.app)
- **Backend**: Render/Railway/Heroku (API REST)
- **Localhost**: Ambiente de desenvolvimento local

## 🚀 1. Deploy do Backend

### Opção A: Render (Recomendado - Grátis)

1. **Criar conta no Render**: https://render.com
2. **Criar novo Web Service**:
   - Conecte seu repositório GitHub
   - **Root Directory**: Deixe VAZIO (não configure)
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.js`
   
   **OU se o Render não permitir remover o prefixo:**
   - **Root Directory**: `backend`
   - **Build Command**: Deixe como está (`npm install` - o Render adiciona o prefixo automaticamente)
   - **Start Command**: Deixe como está (`node server.js` - o Render adiciona o prefixo automaticamente)
   - **Environment Variables**: Adicione as variáveis do seu `.env`
     - `DATABASE_URL` (PostgreSQL ou SQLite)
     - `JWT_SECRET`
     - `FRONTEND_URL` (https://aevum-cdc32.web.app)
     - `NGROK_URL` (se usar)
     - Outras variáveis necessárias

**⚠️ ATENÇÃO**: Se você configurou o Root Directory como `backend`, os comandos devem ser executados DENTRO dessa pasta. Portanto:
- Build Command: `npm install` (sem `backend/`)
- Start Command: `node server.js` (sem `backend/`)

3. **Configurar CORS no backend**:
   - O backend já está configurado para aceitar requisições do Firebase Hosting
   - Verifique se `FRONTEND_URL` inclui `*.web.app` e `*.firebaseapp.com`

4. **Obter URL do backend**: 
   - Render fornecerá uma URL como: `https://seu-app.onrender.com`
   - Use esta URL para configurar o frontend

### Opção B: Railway

1. **Criar conta no Railway**: https://railway.app
2. **Criar novo projeto**:
   - Conecte o repositório
   - Selecione a pasta `backend`
   - Configure as variáveis de ambiente
   - Railway detecta automaticamente Node.js

### Opção C: Heroku

1. **Instalar Heroku CLI**
2. **Login**: `heroku login`
3. **Criar app**: `heroku create seu-app-name`
4. **Configurar variáveis**: `heroku config:set VAR=valor`
5. **Deploy**: `git push heroku main`

## 🔧 2. Configurar Frontend para Produção

Após fazer deploy do backend, atualize a URL da API no frontend:

### Arquivo: `frontend/js/config-api.js`

Substitua `'https://seu-backend.onrender.com/api'` pela URL real do seu backend:

```javascript
const productionApiUrl = 'https://seu-backend.onrender.com/api';
```

### Arquivo: `frontend/js/auth.js`

Substitua `'https://seu-backend.onrender.com'` pela URL real do seu backend:

```javascript
return process.env.PRODUCTION_API_URL || 'https://seu-backend.onrender.com';
```

### Arquivo: `frontend/index.html`

Substitua `'https://seu-backend.onrender.com/api'` pela URL real do seu backend:

```javascript
return isProduction ? 'https://seu-backend.onrender.com/api' : 'http://localhost:3000/api';
```

## 🧪 3. Ambiente Local para Testes

### Manter Localhost Funcionando

O código já está configurado para detectar automaticamente:
- **Localhost**: Usa `http://localhost:3000/api`
- **Produção**: Usa a URL do backend em produção

### Como Testar Localmente

1. **Iniciar Backend Local**:
   ```bash
   cd backend
   npm install
   node server.js
   ```
   Backend rodará em: `http://localhost:3000`

2. **Iniciar Frontend Local**:
   ```bash
   cd frontend
   # Use um servidor HTTP simples
   npx http-server -p 8080
   ```
   Frontend rodará em: `http://localhost:8080`

3. **Ou usar o script de inicialização**:
   ```bash
   .\start-system.bat
   ```

### Verificar Configuração

Abra o console do navegador (F12) e verifique:
```javascript
console.log(window.API_CONFIG.getDebugInfo());
```

Deve mostrar:
- **Localhost**: `apiUrl: "http://localhost:3000/api"`
- **Produção**: `apiUrl: "https://seu-backend.onrender.com/api"`

## 📝 4. Checklist de Deploy

### Backend
- [ ] Backend deployado (Render/Railway/Heroku)
- [ ] Variáveis de ambiente configuradas
- [ ] CORS configurado para aceitar requisições do Firebase
- [ ] Banco de dados configurado (PostgreSQL ou SQLite)
- [ ] URL do backend anotada

### Frontend
- [ ] URLs da API atualizadas nos arquivos:
  - [ ] `frontend/js/config-api.js`
  - [ ] `frontend/js/auth.js`
  - [ ] `frontend/index.html`
- [ ] Frontend deployado no Firebase
- [ ] Testado em produção

### Testes
- [ ] Ambiente local funcionando
- [ ] Login funcionando em produção
- [ ] Todas as funcionalidades testadas

## 🔄 5. Workflow de Desenvolvimento

### Desenvolvimento Local
1. Fazer alterações no código
2. Testar localmente (`.\start-system.bat`)
3. Verificar se tudo funciona
4. Commit e push para GitHub

### Deploy para Produção
1. Backend: Push para GitHub → Render/Railway faz deploy automático
2. Frontend: `firebase deploy --only hosting`
3. Testar em produção

## ⚠️ 6. Variáveis de Ambiente Importantes

### Backend (.env)
```
DATABASE_URL=postgresql://... ou sqlite://database.sqlite
JWT_SECRET=sua-chave-secreta
FRONTEND_URL=https://aevum-cdc32.web.app
NGROK_URL=https://seu-ngrok.ngrok.io/api (opcional)
NODE_ENV=production
```

### Frontend
- Não precisa de `.env` - usa detecção automática
- URLs configuradas diretamente no código

## 🐛 7. Troubleshooting

### Erro: "CORS policy"
- Verifique se `FRONTEND_URL` no backend inclui o domínio do Firebase
- Adicione `*.web.app` e `*.firebaseapp.com` nas origens permitidas

### Erro: "Failed to fetch"
- Verifique se a URL do backend está correta
- Verifique se o backend está online
- Verifique console do navegador para ver a URL sendo usada

### Erro: "Cannot connect to API"
- Em produção: Verifique se o backend está rodando
- Em localhost: Verifique se o backend local está iniciado

## 📚 Recursos

- **Render**: https://render.com/docs
- **Firebase Hosting**: https://firebase.google.com/docs/hosting
- **Railway**: https://docs.railway.app

