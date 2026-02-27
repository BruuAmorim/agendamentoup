# Deploy do backend no Vercel

A API (backend) é publicada no **Vercel** como serverless. Ex.: `https://cloudd-agenda-backend.vercel.app/api`

## 1. Fazer login no Vercel (obrigatório antes do primeiro deploy)

```bash
npx vercel login
```

Siga o fluxo no navegador ou no terminal para autenticar.

## 2. Deploy em produção

```bash
npm run deploy:vercel
```

Ou diretamente:

```bash
npx vercel --prod
```

## 3. Deploy de preview (teste, sem alterar produção)

```bash
npm run deploy:vercel:preview
```

Ou:

```bash
npx vercel
```

---

**Variáveis de ambiente:** Configure no Vercel (Dashboard do projeto → Settings → Environment Variables) as mesmas variáveis do `.env` (ex.: `DATABASE_URL`, `JWT_SECRET`), principalmente para produção.
