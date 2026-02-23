# 🔧 Corrigir Erro no Deploy do Vercel

## ❌ Erro Identificado

```
The name contains invalid characters. Only letters, digits, and underscores are allowed. 
Furthermore, the name should not start with a digit.
```

## 🔍 Possíveis Causas

1. **Nome do Projeto:** O nome "agendamentoup" pode ter caracteres inválidos
2. **Variáveis de Ambiente:** Alguma variável pode ter nome inválido
3. **Root Directory:** O caminho pode ter caracteres inválidos

## ✅ Soluções

### **Solução 1: Corrigir Nome do Projeto**

No Vercel, altere o nome do projeto para usar apenas:
- Letras (a-z, A-Z)
- Números (0-9)
- Underscores (_)
- Hífens (-)

**Nomes válidos:**
- `cloudd-agenda`
- `agendamento_up`
- `agendamento_backend`

**Nomes inválidos:**
- `agendamentoup` (pode ter problema)
- `123agendamento` (não pode começar com número)
- `agendamento@up` (caracteres especiais)

### **Solução 2: Verificar Variáveis de Ambiente**

Certifique-se de que os **nomes** das variáveis de ambiente estão corretos:

✅ **Válidos:**
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV`
- `FRONTEND_URL`
- `VERCEL`

❌ **Inválidos:**
- `DATABASE-URL` (hífen pode causar problema)
- `JWT.SECRET` (ponto não é permitido)
- `123_VAR` (não pode começar com número)

### **Solução 3: Verificar DATABASE_URL Completa**

Na imagem, vejo que `DATABASE_URL` parece estar incompleta:
```
postgresql://postgres:Brunadados123!@
```

**Deve ser completa:**
```
postgresql://postgres:Brunadados123!@db.sccxpskdohmqvrnkudva.supabase.co:5432/postgres
```

### **Solução 4: Verificar JWT_SECRET Completo**

Na imagem, vejo que `JWT_SECRET` parece estar incompleto:
```
53a993b88006cabe7d7c2b4560ea71215
```

**Deve ser o JWT_SECRET completo que geramos:**
```
7297d18ca8d7f1f3cf58ead974ba377cbf33399a59892a1c17372800f9303122a69fc16fd2078d9106d6ec678914d2953a993b88006cabe7d7c2b4560ea71215
```

## 📋 Passo a Passo para Corrigir

### **1. No Vercel Dashboard:**

1. **Alterar Nome do Projeto:**
   - Vá em **Settings** > **General**
   - Altere o nome do projeto para: `cloudd-agenda-backend` ou `agendamento-backend`
   - Salve

2. **Verificar Variáveis de Ambiente:**
   - Vá em **Settings** > **Environment Variables**
   - Verifique se todos os nomes estão corretos
   - Certifique-se de que `DATABASE_URL` está completa
   - Certifique-se de que `JWT_SECRET` está completo

3. **Verificar Build Settings:**
   - **Root Directory:** Deixe como `./` ou vazio
   - **Build Command:** Deixe vazio (não precisa build)
   - **Output Directory:** Deixe vazio
   - **Install Command:** `npm install`

### **2. Variáveis de Ambiente Corretas:**

```
DATABASE_URL=postgresql://postgres:SUA_SENHA@db.sccxpskdohmqvrnkudva.supabase.co:5432/postgres
JWT_SECRET=7297d18ca8d7f1f3cf58ead974ba377cbf33399a59892a1c17372800f9303122a69fc16fd2078d9106d6ec678914d2953a993b88006cabe7d7c2b4560ea71215
NODE_ENV=production
FRONTEND_URL=https://cloudd-agenda.web.app
VERCEL=1
```

### **3. Tentar Deploy Novamente:**

Após corrigir tudo, clique em **"Deploy"** novamente.

## 🎯 Checklist de Correção

- [ ] Nome do projeto alterado para usar apenas letras, números, hífens e underscores
- [ ] Nome do projeto não começa com número
- [ ] Todas as variáveis de ambiente têm nomes válidos
- [ ] `DATABASE_URL` está completa (com host, porta e database)
- [ ] `JWT_SECRET` está completo (128 caracteres)
- [ ] Root Directory está correto (`./` ou vazio)
- [ ] Build Command está vazio
- [ ] Output Directory está vazio

## 💡 Dica

Se o erro persistir, tente criar um **novo projeto** no Vercel com um nome mais simples:
- `cloudd-agenda-api`
- `agendamento-backend`
- `cloudd-backend`

