# OAuth proxy (Cloudflare Worker)

O GitHub não troca o código OAuth direto do browser. Este Worker faz só isso.

## 1. Criar o GitHub OAuth App

Na organização **bobalokaacessorios**:

1. Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `https://bobaloka.com.br`
3. Authorization callback URL: `https://SEU-WORKER.workers.dev/callback`
4. Copie o Client ID e o Client Secret

## 2. Publicar o Worker

```bash
cd oauth-worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

## 3. Ligar o admin

Em `links/admin/config.js`:

```js
clientId: "o-client-id-do-oauth-app",
oauthBaseUrl: "https://SEU-WORKER.workers.dev",
```

Depois acesse `/links/admin` e entre com uma conta colaboradora de `bobalokaacessorios/site`.
