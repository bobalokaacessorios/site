# Bobaloka Acessórios

Site institucional da Bobaloka Acessórios.

- `/` — página de marca (logo e o texto Acessórios)
- `/links` — links da marca (conteúdo em `data/links.json`)
- `/links/admin` — painel para editar `/links` (login GitHub, só colaboradores)

## Como ver

```bash
python3 -m http.server 8765
```

- Home: [http://127.0.0.1:8765/](http://127.0.0.1:8765/)
- Links: [http://127.0.0.1:8765/links](http://127.0.0.1:8765/links)
- Admin: [http://127.0.0.1:8765/links/admin](http://127.0.0.1:8765/links/admin)

## Painel admin

O admin grava `data/links.json` no repositório `bobalokaacessorios/site`.

1. Crie um GitHub OAuth App na organização
2. Publique o Worker em `oauth-worker/` (veja o README dessa pasta)
3. Preencha `clientId` e `oauthBaseUrl` em `links/admin/config.js`

Ícones e imagens usam URL (do próprio site ou externa).

## Estrutura

```
index.html              Home da marca
links/index.html        Página pública de links
links/admin/            Painel de edição
data/links.json         Conteúdo editável
oauth-worker/           Proxy OAuth do GitHub
css/                    Estilos
js/                     Scripts
assets/                 Logo, foto da loja, ícones e linhas
```
