# 🔧 Solução: API Key Rejeitada no n8n

## ⚠️ Problema Identificado

A API Key está sendo rejeitada por dois motivos principais:

### 1. **Erro no Header (Mais Comum)**
O header está sendo configurado com dois pontos (`:`) no final:
- ❌ **Errado:** `x-api-key:` 
- ✅ **Correto:** `x-api-key`

**Erro no n8n:**
```
Header name must be a valid HTTP token ["x-api-key:"]
```

### 2. **API Key Não Encontrada no Banco**
A API Key pode não estar sendo salva corretamente ou pode ter sido regenerada.

---

## ✅ Soluções

### **Solução 1: Corrigir Header no n8n**

1. **No n8n, vá para o nó HTTP Request**
2. **Na seção "Headers":**
   - **Nome do header:** `x-api-key` (SEM dois pontos no final)
   - **Valor:** `AEVUM_11_c0bc9de5888d918f9967447c890dc756` (sua chave completa)

3. **Verifique:**
   - Não deve ter `:` após `x-api-key`
   - Não deve ter espaços extras
   - A chave deve estar completa (não truncada)

### **Solução 2: Verificar API Key no Banco**

1. **Regenere a API Key:**
   - Acesse: `/app/settings` → Aba "Integrações"
   - Clique em "Gerar Nova API Key"
   - **COPIE A CHAVE COMPLETA** imediatamente

2. **Formato correto:**
   ```
   AEVUM_<empresaId>_<32 caracteres hexadecimais>
   ```
   Exemplo: `AEVUM_11_c0bc9de5888d918f9967447c890dc756`

### **Solução 3: Testar API Key com curl**

Teste se a API Key funciona diretamente:

```bash
curl -X GET \
  "http://localhost:3000/api/public/appointments/available/2026-02-12" \
  -H "x-api-key: AEVUM_11_c0bc9de5888d918f9967447c890dc756"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-12",
    "available_slots": [...]
  }
}
```

**Se retornar erro 401:**
- A API Key não está no banco ou está incorreta
- Regenere a chave e teste novamente

---

## 🔍 Debug no Backend

O backend agora tem logs detalhados. Verifique os logs quando fizer a requisição:

```
🔍 [empresaApiKeyMiddleware] Verificando API Key...
🔍 [empresaApiKeyMiddleware] Buscando empresa pela API Key...
🔍 [EmpresaApiKeyService] Buscando empresa ID: 11 pelo prefixo
✅ [EmpresaApiKeyService] Empresa encontrada por API Key: ID 11
✅ [empresaApiKeyMiddleware] Empresa autenticada: ID 11 - Nome da Empresa
```

**Se aparecer erro:**
- `⚠️ Formato de API Key inválido` → Verifique o formato
- `⚠️ Empresa não encontrada` → A API Key não está no banco
- `⚠️ API Key inválida` → O hash não corresponde

---

## 📋 Checklist de Configuração no n8n

- [ ] Header configurado como `x-api-key` (SEM dois pontos)
- [ ] Valor do header é a API Key completa
- [ ] API Key foi copiada corretamente (sem espaços extras)
- [ ] URL está correta: `http://localhost:3000/api/public/appointments/available/...`
- [ ] Backend está rodando na porta 3000
- [ ] Teste com curl funcionou primeiro

---

## 🐛 Problemas Comuns

### **Problema 1: "Header name must be a valid HTTP token"**

**Causa:** Dois pontos (`:`) no final do nome do header.

**Solução:**
- No n8n, edite o header
- Remova qualquer `:` após `x-api-key`
- Deve ficar apenas: `x-api-key`

### **Problema 2: "API Key inválida ou não encontrada"**

**Causa:** API Key não está no banco ou foi regenerada.

**Solução:**
1. Regenere a API Key no painel
2. Copie a chave completa
3. Atualize no n8n
4. Teste novamente

### **Problema 3: "Formato de API Key inválido"**

**Causa:** API Key não começa com `AEVUM_` ou está truncada.

**Solução:**
- Verifique se copiou a chave completa
- Formato: `AEVUM_<id>_<32chars>`
- Não deve ter espaços ou caracteres extras

---

## 🔄 Atualizações no Código

O middleware foi atualizado para:
- ✅ Aceitar header com dois pontos no final (remove automaticamente)
- ✅ Limpar espaços em branco
- ✅ Logs detalhados para debug
- ✅ Mensagens de erro mais claras

---

## 📞 Próximos Passos

1. **Corrija o header no n8n** (remova os dois pontos)
2. **Teste com curl** primeiro
3. **Verifique os logs do backend**
4. **Se ainda não funcionar, regenere a API Key**

---

## ✅ Exemplo Correto de Configuração no n8n

**HTTP Request Node:**

```
Method: GET
URL: http://localhost:3000/api/public/appointments/available/{{ $json.date }}

Headers:
  Name: x-api-key
  Value: AEVUM_11_c0bc9de5888d918f9967447c890dc756

Query Parameters:
  duration: 60
```

**Importante:**
- Nome do header: `x-api-key` (sem dois pontos)
- Valor: API Key completa sem espaços
- URL: sem barras duplas





