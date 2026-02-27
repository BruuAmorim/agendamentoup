# Deploy do frontend no Firebase Hosting

Para publicar as atualizações do frontend em produção (ex.: `doudd-agenda.web.app`):

## 1. Instalar o Firebase CLI (se ainda não tiver)

```bash
npm install -g firebase-tools
```

## 2. Fazer login no Firebase

```bash
firebase login
```

## 3. Associar o projeto (primeira vez ou se mudar de projeto)

```bash
firebase use doudd-agenda
```

(O projeto atual está configurado como `cloudd-agenda`. Para outro projeto: `firebase use SEU_PROJECT_ID`.)

## 4. Fazer o deploy apenas do frontend (Hosting)

```bash
npm run deploy:firebase
```

Ou diretamente:

```bash
firebase deploy --only hosting
```

## 5. Deploy completo (Hosting + Functions)

```bash
npm run deploy:firebase:full
```

---

**O que foi ajustado:** O `firebase.json` tinha um rewrite que enviava todas as rotas para `/index.html`, o que impedia o acesso correto a páginas como `/admin/dashboard.html`. Esse rewrite foi removido para que cada arquivo HTML seja servido corretamente.
