# 🔐 Variáveis de Ambiente para Vercel

## 📋 Variáveis Necessárias

Copie e cole estas variáveis no Vercel:

### **1. DATABASE_URL**
```
postgresql://postgres:Brunadados123!@db.sccxpskdohmqvrnkudva.supabase.co:5432/postgres
```

**⚠️ IMPORTANTE:** Substitua `Brunadados123!` pela senha real do seu banco Supabase se for diferente.

### **2. JWT_SECRET**
```
7297d18ca8d7f1f3cf58ead974ba377cbf33399a59892a1c17372800f9303122a69fc16fd2078d9106d6ec678914d2953a993b88006cabe7d7c2b4560ea71215
```

### **3. NODE_ENV**
```
production
```

### **4. FRONTEND_URL**
```
https://cloudd-agenda.web.app
```

### **5. VERCEL**
```
1
```

---

## 📝 Como Adicionar no Vercel

1. Vá em **Settings** > **Environment Variables**
2. Para cada variável:
   - Clique em **"Add New"**
   - Cole o **nome** da variável
   - Cole o **valor** da variável
   - Marque: **Production**, **Preview** e **Development**
   - Clique em **"Save"**

---

## ✅ Verificação

Após adicionar todas as variáveis, você deve ter:

| Nome | Valor (exemplo) |
|------|----------------|
| `DATABASE_URL` | `postgresql://postgres:...@db....supabase.co:5432/postgres` |
| `JWT_SECRET` | `7297d18ca8d7f1f3cf58ead974ba377cbf33399a59892a1c17372800f9303122a69fc16fd2078d9106d6ec678914d2953a993b88006cabe7d7c2b4560ea71215` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://cloudd-agenda.web.app` |
| `VERCEL` | `1` |

---

## ⚠️ Problemas Comuns

### **DATABASE_URL incompleta**
❌ Errado: `postgresql://postgres:senha@`
✅ Correto: `postgresql://postgres:senha@host:port/database`

### **JWT_SECRET incompleto**
❌ Errado: `53a993b88006cabe7d7c2b4560ea71215` (muito curto)
✅ Correto: `7297d18ca8d7f1f3cf58ead974ba377cbf33399a59892a1c17372800f9303122a69fc16fd2078d9106d6ec678914d2953a993b88006cabe7d7c2b4560ea71215` (128 caracteres)

### **Caracteres especiais na senha**
Se sua senha do Supabase tiver caracteres especiais, certifique-se de que estão codificados corretamente na URL.

