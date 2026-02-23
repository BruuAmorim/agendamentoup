# 🆕 Criar Novo Projeto Firebase

## 📋 Opções para Criar Novo Projeto

### **Opção 1: Via Firebase Console (Recomendado - Mais Fácil)**

#### **Passo 1: Acessar Firebase Console**
1. Acesse: https://console.firebase.google.com
2. Faça login com sua conta Google

#### **Passo 2: Criar Novo Projeto**
1. Clique em **"Adicionar projeto"** ou **"Create a project"**
2. Preencha:
   - **Nome do projeto:** `cloudd-agenda` (ou outro nome de sua escolha)
   - **ID do projeto:** Será gerado automaticamente (ex: `cloudd-agenda-12345`)
3. Clique em **"Continuar"**

#### **Passo 3: Configurar Google Analytics (Opcional)**
- Você pode desabilitar o Google Analytics se não quiser
- Ou habilitar se quiser usar no futuro
- Clique em **"Continuar"**

#### **Passo 4: Finalizar**
1. Clique em **"Criar projeto"**
2. Aguarde alguns segundos
3. Clique em **"Continuar"** quando estiver pronto

#### **Passo 5: Ativar Firebase Hosting**
1. No menu lateral, clique em **"Hosting"**
2. Clique em **"Começar"** ou **"Get started"**
3. Siga as instruções (pode pular a parte de instalar CLI se já tiver)

---

### **Opção 2: Via Firebase CLI**

Se preferir criar via terminal:

```bash
# Listar projetos existentes
firebase projects:list

# Criar novo projeto (requer autenticação)
firebase projects:create cloudd-agenda --display-name "Cloudd Agenda"
```

**Nota:** A criação via CLI pode não estar disponível em todas as contas. Use a Opção 1 se der erro.

---

## 🔧 Configurar Projeto Local

Após criar o projeto no Firebase Console:

### **1. Obter o Project ID**

No Firebase Console, você verá o **Project ID** (ex: `cloudd-agenda-12345`)

### **2. Atualizar .firebaserc**

Atualize o arquivo `.firebaserc` com o novo Project ID:

```json
{
  "projects": {
    "default": "cloudd-agenda-12345"
  }
}
```

### **3. Selecionar o Projeto**

```bash
firebase use cloudd-agenda-12345
```

### **4. Verificar Configuração**

```bash
firebase projects:list
```

Você deve ver o novo projeto marcado como `(current)`.

---

## 🚀 Fazer Deploy no Novo Projeto

Após configurar:

```bash
firebase deploy --only hosting
```

Você receberá uma nova URL como:
```
https://cloudd-agenda-12345.web.app
```

---

## 📝 Checklist

- [ ] Projeto criado no Firebase Console
- [ ] Firebase Hosting ativado
- [ ] Project ID copiado
- [ ] `.firebaserc` atualizado
- [ ] Projeto selecionado via CLI
- [ ] Deploy realizado com sucesso
- [ ] Nova URL funcionando

---

## ⚠️ Importante

- O projeto antigo (`aevum-cdc32`) continuará existindo
- Você pode ter múltiplos projetos no Firebase
- Cada projeto tem sua própria URL
- Você pode deletar o projeto antigo depois se quiser

---

**🎯 Pronto para criar o novo projeto!**

Siga os passos acima e depois me avise o **Project ID** para eu atualizar os arquivos de configuração.

