# 🔧 Solução: Erro "Invalid characters in name" no Vercel

## ❌ Erro Atual

```
The name contains invalid characters. Only letters, digits, and underscores are allowed. 
Furthermore, the name should not start with a digit.
```

## 🎯 Solução Definitiva

O problema está no **nome do projeto no Vercel**. Você precisa alterar o nome do projeto.

### **Passo 1: Alterar Nome do Projeto no Vercel**

1. **No Vercel Dashboard:**
   - Vá para o projeto que está dando erro
   - Clique em **"Settings"** (Configurações)
   - Clique em **"General"**
   - Role até **"Project Name"**
   - Altere o nome para: `cloudd-agenda-backend`
   - Clique em **"Save"**

### **Passo 2: Verificar Build Settings**

Na página de configuração do deploy, certifique-se de:

1. **Root Directory:** `./` (ou deixe vazio)
2. **Build Command:** **DEIXE VAZIO** (não precisa build)
3. **Output Directory:** **DEIXE VAZIO**
4. **Install Command:** `npm install` (ou deixe padrão)

### **Passo 3: Verificar Variáveis de Ambiente**

Certifique-se de que todas as variáveis estão corretas:

✅ **DATABASE_URL:**
```
postgresql://postgres:Bancodedados123@db.sccxpskdohmqvrnkudva.supabase.co:5432/postgres
```

✅ **JWT_SECRET:**
```
7297d18ca8d7f1f3cf58ead974ba377cbf33399a59892a1c17372800f9303122a69fc16fd2078d9106d6ec678914d2953a993b88006cabe7d7c2b4560ea71215
```

✅ **NODE_ENV:**
```
production
```

✅ **FRONTEND_URL:**
```
https://cloudd-agenda.web.app
```

✅ **VERCEL:**
```
1
```

### **Passo 4: Tentar Deploy Novamente**

Após alterar o nome do projeto:
1. Volte para a página de deploy
2. Clique em **"Deploy"**
3. O erro deve desaparecer

---

## 🔄 Alternativa: Criar Novo Projeto

Se o erro persistir, crie um novo projeto:

### **1. Cancelar Deploy Atual**
- Feche a página atual
- Vá para o dashboard do Vercel

### **2. Criar Novo Projeto**
1. Clique em **"Add New Project"**
2. Selecione o repositório GitHub
3. **Nome do Projeto:** Digite `cloudd-agenda-backend` (sem espaços, sem caracteres especiais)
4. **Framework Preset:** Selecione **"Other"**
5. Configure as variáveis de ambiente
6. Clique em **"Deploy"**

---

## 📋 Nomes Válidos para Projeto

✅ **Válidos:**
- `cloudd-agenda-backend`
- `cloudd_agenda_backend`
- `agendamento-backend`
- `agendamento123`

❌ **Inválidos:**
- `agendamentoup` (pode ter problema)
- `123agendamento` (não pode começar com número)
- `agendamento@up` (caracteres especiais)
- `agendamento.up` (pontos não são permitidos)

---

## ⚠️ Importante

- O nome do projeto no Vercel **NÃO** precisa ser igual ao nome do repositório
- Você pode ter um repositório chamado `agendamentoup` e um projeto Vercel chamado `cloudd-agenda-backend`
- O nome do projeto é apenas para identificação no Vercel

---

## ✅ Checklist Final

- [ ] Nome do projeto alterado para `cloudd-agenda-backend`
- [ ] Build Command está vazio
- [ ] Output Directory está vazio
- [ ] Todas as variáveis de ambiente estão corretas
- [ ] DATABASE_URL está completa
- [ ] JWT_SECRET está completo (128 caracteres)
- [ ] Tentou deploy novamente

---

**🎯 A solução é simplesmente alterar o nome do projeto no Vercel!**

