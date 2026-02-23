# 🚀 Guia de Deploy do Frontend no Firebase

## 📋 Pré-requisitos

1. ✅ Firebase CLI instalado (já está: versão 15.7.0)
2. ✅ Projeto Firebase configurado (projeto: `aevum-cdc32`)
3. ✅ Backend deployado no Vercel (você acabou de fazer)

---

## ⚠️ IMPORTANTE: Atualizar URL do Backend

Antes do deploy, você precisa atualizar a URL do backend do Vercel nos arquivos do frontend.

### **1. Obter URL do Backend no Vercel**

Após fazer deploy do backend no Vercel, você receberá uma URL como:
```
https://seu-projeto-backend.vercel.app
```

### **2. Atualizar Arquivos do Frontend**

Substitua todas as referências a `https://agendamentoup.onrender.com` pela URL do seu backend no Vercel.

**Arquivos que precisam ser atualizados:**
- `frontend/js/config-api.js` (linha 41)
- `frontend/js/auth.js` (linha 40)
- `frontend/index.html` (linha 148)
- `frontend/css/index.html` (linha 144)

**Exemplo:**
```javascript
// ANTES:
const productionApiUrl = 'https://agendamentoup.onrender.com/api';

// DEPOIS (substitua pela URL do seu Vercel):
const productionApiUrl = 'https://seu-backend.vercel.app/api';
```

---

## 🚀 Passo a Passo do Deploy

### **1. Verificar Login no Firebase**

```bash
firebase login
```

Se já estiver logado, pule esta etapa.

### **2. Verificar Projeto Firebase**

```bash
firebase projects:list
```

Certifique-se de que o projeto `aevum-cdc32` está listado.

### **3. Selecionar Projeto (se necessário)**

```bash
firebase use aevum-cdc32
```

### **4. Fazer Deploy**

```bash
firebase deploy --only hosting
```

### **5. Verificar Deploy**

Após o deploy, você receberá uma URL como:
```
https://aevum-cdc32.web.app
ou
https://aevum-cdc32.firebaseapp.com
```

---

## 🔍 Verificar Deploy

### **1. Acessar o Site**

Abra a URL fornecida pelo Firebase no navegador.

### **2. Testar Login**

1. Acesse a página de login
2. Tente fazer login com suas credenciais
3. Verifique se está conectando ao backend do Vercel

### **3. Verificar Console do Navegador**

Abra o DevTools (F12) e verifique:
- ✅ Não há erros de CORS
- ✅ As requisições estão indo para a URL correta do Vercel
- ✅ As respostas estão chegando corretamente

---

## ⚙️ Configurações do Firebase

O arquivo `firebase.json` já está configurado:

```json
{
  "hosting": {
    "public": "frontend",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Isso significa:
- ✅ A pasta `frontend/` será publicada
- ✅ Todas as rotas serão redirecionadas para `index.html` (SPA)
- ✅ Arquivos estáticos serão servidos corretamente

---

## 🔄 Atualizações Futuras

Para fazer deploy de atualizações:

```bash
firebase deploy --only hosting
```

---

## 🐛 Troubleshooting

### **Erro: "Firebase CLI not found"**
```bash
npm install -g firebase-tools
```

### **Erro: "Permission denied"**
```bash
firebase login
```

### **Erro: "Project not found"**
```bash
firebase use aevum-cdc32
```

### **Erro de CORS no navegador**
- Verifique se a URL do backend está correta
- Verifique se o backend no Vercel está configurado para aceitar requisições do Firebase
- O backend já está configurado para aceitar `*.firebaseapp.com` e `*.web.app`

### **Erro: "Cannot GET /rota"**
- Isso é normal para SPAs
- O Firebase está configurado para redirecionar todas as rotas para `index.html`
- Se persistir, verifique o `firebase.json`

---

## 📝 Checklist Final

- [ ] URL do backend do Vercel atualizada em todos os arquivos
- [ ] Login no Firebase realizado
- [ ] Deploy executado com sucesso
- [ ] Site acessível e funcionando
- [ ] Login testado e funcionando
- [ ] Console do navegador sem erros

---

## 🎯 Próximos Passos

1. ✅ Fazer deploy do frontend
2. ✅ Testar todas as funcionalidades
3. ✅ Configurar domínio customizado (opcional)
4. ✅ Configurar SSL/HTTPS (automático no Firebase)

---

**🎉 Pronto! Seu frontend está no ar!**

Se tiver algum problema, verifique os logs do Firebase ou entre em contato.

