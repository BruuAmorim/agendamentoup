# Deploy do backend no Vercel

## Configuração obrigatória no painel

1. **Root Directory:** deixe **vazio** (ou `.`). O repositório raiz deve ser a raiz do projeto para que a pasta `api/` seja encontrada.
2. **Framework Preset:** Other (ou None).
3. **Build Command:** pode deixar em branco ou `npm run build`.
4. **Variáveis de ambiente:** defina no projeto: `DATABASE_URL`, `JWT_SECRET`, e opcionalmente `NODE_ENV=production`.

## URLs após o deploy

- Raiz: `https://seu-projeto.vercel.app/`
- Health: `https://seu-projeto.vercel.app/api/health`
- Login: `https://seu-projeto.vercel.app/api/auth/login`

Se aparecer 404, confira em **Settings → General** se o **Root Directory** está vazio.
