# 🚀 Deploy Completo: Frontend no Firebase

## ✅ Status Atual

- ✅ Firebase CLI instalado (v15.7.0)
- ✅ Projeto Firebase configurado: `aevum-cdc32`
- ✅ Projeto selecionado e pronto para deploy
- ⚠️ **PENDENTE:** Atualizar URL do backend do Vercel

---

## 📋 Passo 1: Obter URL do Backend no Vercel

### **1.1. Acesse o Dashboard do Vercel**
1. Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
2. Encontre o projeto do backend que você acabou de fazer deploy
3. Clique no projeto

### **1.2. Copie a URL**
Você verá uma URL como:
```
https://seu-projeto-backend.vercel.app
```

**Exemplo:**
```
https://agendamentoup-backend.vercel.app
```

---

## 📋 Passo 2: Atualizar URLs no Frontend

### **Opção A: Script Automático (Recomendado)**

Execute o script que criei:

```bash
node atualizar-url-backend.js "https://SUA-URL-DO-VERCEL.vercel.app"
```

**Exemplo:**
```bash
node atualizar-url-backend.js "https://agendamentoup-backend.vercel.app"
```

O script irá:
- ✅ Atualizar `frontend/js/config-api.js`
- ✅ Atualizar `frontend/js/auth.js`
- ✅ Atualizar `frontend/index.html`
- ✅ Atualizar `frontend/css/index.html`

### **Opção B: Atualização Manual**

Se preferir atualizar manualmente, substitua em todos os arquivos:

**Arquivos para atualizar:**
1. `frontend/js/config-api.js` (linha 41)
2. `frontend/js/auth.js` (linha 40)
3. `frontend/index.html` (linha 148)
4. `frontend/css/index.html` (linha 144)

**Substituir:**
```javascript
// ANTES:
'https://agendamentoup.onrender.com/api'
'https://evaagendamento.onrender.com/api'

// DEPOIS (use a URL do seu Vercel):
'https://seu-backend.vercel.app/api'
```

---

## 📋 Passo 3: Fazer Deploy no Firebase

Após atualizar as URLs, execute:

```bash
firebase deploy --only hosting
```

### **O que acontece:**
1. Firebase faz build dos arquivos
2. Faz upload da pasta `frontend/`
3. Configura as rotas (SPA)
4. Fornece a URL do site

### **URLs que você receberá:**
```
https://aevum-cdc32.web.app
https://aevum-cdc32.firebaseapp.com
```

---

## 📋 Passo 4: Verificar Deploy

### **4.1. Acessar o Site**
Abra a URL fornecida pelo Firebase no navegador.

### **4.2. Testar Funcionalidades**
1. ✅ Página de login carrega
2. ✅ Login funciona
3. ✅ Agendamentos carregam
4. ✅ Todas as funcionalidades funcionam

### **4.3. Verificar Console do Navegador**
1. Abra DevTools (F12)
2. Vá em "Console"
3. Verifique:
   - ✅ Não há erros de CORS
   - ✅ Requisições estão indo para a URL correta do Vercel
   - ✅ Respostas estão chegando corretamente

### **4.4. Verificar Network**
1. Abra DevTools (F12)
2. Vá em "Network"
3. Faça login
4. Verifique se as requisições estão indo para:
   ```
   https://seu-backend.vercel.app/api/...
   ```

---

## 🔄 Comandos Rápidos

### **Atualizar URLs:**
```bash
node atualizar-url-backend.js "https://seu-backend.vercel.app"
```

### **Fazer Deploy:**
```bash
firebase deploy --only hosting
```

### **Ver Logs:**
```bash
firebase hosting:channel:list
```

### **Reverter Deploy:**
```bash
firebase hosting:rollback
```

---

## 🐛 Troubleshooting

### **Erro: "Cannot find module" no script**
```bash
# Certifique-se de estar na raiz do projeto
cd C:\Users\Bruna\Desktop\agendamentoup
node atualizar-url-backend.js "https://seu-backend.vercel.app"
```

### **Erro: "URL não encontrada"**
- Verifique se a URL do Vercel está correta
- Certifique-se de incluir `https://` e `.vercel.app`
- Não inclua `/api` no final (o script adiciona automaticamente)

### **Erro de CORS no navegador**
- Verifique se o backend no Vercel está configurado para aceitar requisições do Firebase
- O backend já está configurado para aceitar `*.firebaseapp.com` e `*.web.app`
- Verifique se a URL do backend está correta

### **Erro: "Firebase login required"**
```bash
firebase login
```

### **Erro: "Project not found"**
```bash
firebase use aevum-cdc32
```

---

## ✅ Checklist Final

- [ ] URL do backend do Vercel obtida
- [ ] URLs atualizadas no frontend (script ou manual)
- [ ] Deploy executado com sucesso
- [ ] Site acessível
- [ ] Login testado e funcionando
- [ ] Console do navegador sem erros
- [ ] Network mostrando requisições corretas

---

## 🎯 Próximos Passos (Opcional)

1. **Domínio Customizado:**
   - No Firebase Console, vá em "Hosting"
   - Clique em "Adicionar domínio customizado"
   - Siga as instruções

2. **Configurar SSL:**
   - O Firebase já fornece SSL automático
   - Não é necessário configurar nada

3. **Monitoramento:**
   - Use Firebase Analytics (opcional)
   - Configure alertas (opcional)

---

**🎉 Pronto para fazer deploy!**

Siga os passos acima e seu frontend estará no ar!

