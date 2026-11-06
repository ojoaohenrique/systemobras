# Gestão de Obra – Borderô

Sistema de acompanhamento das obras de Campo Belo I e II: lançamentos do borderô, folha (custo fixo), compra de equipamentos, cronograma planejado × executado, orçamento e custo por m² loteável.

As telas e os cálculos são do arquivo HTML original. O que mudou foi a base por trás:

| Antes (arquivo HTML) | Agora |
| --- | --- |
| Dados escritos dentro do código e salvos no navegador de cada um | Banco PostgreSQL único, todo mundo vê a mesma coisa |
| Sem login: quem tinha o arquivo via tudo | Login com 4 perfis de acesso |
| Salário, CPF e PIX visíveis para qualquer pessoa | Dados pessoais da folha só para admin e financeiro |
| Limpar o navegador apagava tudo | Dados no servidor, com backup |
| Sem histórico | Registro de quem criou, editou ou excluiu cada lançamento |

## Estrutura

```
server/            back-end (Node.js + Express)
  index.js           servidor web, segurança e rotas
  auth.js            login, sessões, perfis e permissões
  routes/dados.js    lançamentos, orçamento, cronograma, áreas, importação
  routes/usuarios.js usuários e histórico (só admin)
  migrations/        estrutura do banco (SQL)
  scripts/           migrate, seed (carga inicial), criar-usuario
public/            front-end (telas)
  index.html         sistema (telas originais)
  js/app.js          cálculos e telas originais, ligados à API
  js/boot.js         checa o login e carrega os dados
  login.html, senha.html, admin.html
legado/            arquivo HTML original (fonte da carga inicial; tem dados pessoais, não publicar)
```

## Perfis

| Perfil | O que pode |
| --- | --- |
| **admin** | Tudo, inclusive criar usuários, importar dados do arquivo antigo e ver o histórico |
| **financeiro** | Ver e editar tudo, inclusive folha, CPF, PIX e salários |
| **engenharia** | Ver tudo e editar borderô, equipamentos e áreas. A folha aparece com os valores, mas sem nome, salário e PIX |
| **leitura** | Só consultar, sem dados pessoais nem dados de pagamento |

As permissões são checadas no servidor. Esconder botões na tela é só conveniência.

## Como rodar no computador (Windows)

Pré-requisitos: **Node.js 20 ou mais novo** ([nodejs.org](https://nodejs.org)) e **PostgreSQL**.

### 1. Banco de dados

Escolha uma das opções:

- **PostgreSQL instalado ou portátil** (ex.: a pasta `pgportable`): crie um banco e um usuário. No `psql`:
  ```sql
  CREATE USER obras WITH PASSWORD 'troque-esta-senha';
  CREATE DATABASE obras OWNER obras;
  ```
- **Docker**: nesta pasta, rode `docker compose up -d`.
- **Supabase** (banco na nuvem): no painel, abra **Connect** (ou Project Settings > Database), copie a *Connection string* do **Session pooler** em formato URI e troque `[YOUR-PASSWORD]` pela senha do banco. Essa string vai no `DATABASE_URL`. A conexão criptografada liga sozinha. Não precisa das chaves `NEXT_PUBLIC_...` nem do pacote `@supabase/supabase-js`: o sistema fala direto com o Postgres e tem login próprio.

### 2. Configuração

Copie `.env.example` para `.env` e ajuste o `DATABASE_URL` com usuário, senha e porta do seu Postgres.

### 3. Instalar e preparar o banco

No terminal, dentro desta pasta:

```
npm install
npm run setup
```

O `setup` cria as tabelas e faz a carga inicial lendo o arquivo `legado/gestao-de-obra-bordero.html`: 463 lançamentos (255 do borderô, 196 da folha e 12 de equipamentos), o orçamento de CB1, CB2 e o compartilhado, e o cronograma planejado. Rodar de novo não duplica nada.

### 4. Criar o primeiro administrador

```
npm run criar-usuario -- seu@email.com "Seu Nome" admin
```

Uma senha é gerada e mostrada uma única vez. Os outros usuários podem ser criados pela tela **Usuários e importação**.

### 5. Iniciar

```
npm start
```

Abra http://localhost:3000.

## Trazer os lançamentos feitos no arquivo antigo

A carga inicial usa os dados que estavam escritos no HTML. O que o engenheiro lançou ou importou depois ficou salvo só no navegador dele. Para trazer isso:

1. Entre como admin, abra **Usuários e importação** e siga o passo a passo da seção "Trazer os dados do arquivo antigo".
2. Use a opção **Adicionar**: só entram os lançamentos que ainda não existem.

## Colocar no ar (servidor)

Funciona em qualquer hospedagem com Node.js e PostgreSQL (VPS com Nginx/Caddy, Render, Railway, Fly.io etc.).

- **Use HTTPS sempre.** Sem ele, a senha trafega aberta.
- No `.env` do servidor: `NODE_ENV=production`, `COOKIE_SECURE=1` e, se tiver proxy na frente, `TRUST_PROXY=1`.
- Rode `npm run setup` uma vez e crie o admin com `npm run criar-usuario`.
- **Backup diário** do banco:
  ```
  pg_dump "$DATABASE_URL" -Fc -f backups/obras-$(date +%F).dump
  ```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm start` | Inicia o sistema |
| `npm run dev` | Inicia e reinicia sozinho quando um arquivo muda |
| `npm run migrate` | Aplica mudanças de estrutura do banco |
| `npm run seed` | Carga inicial (não mexe em lançamentos que já existem) |
| `npm run seed -- --forcar` | **Apaga** os lançamentos e recarrega do HTML antigo |
| `npm run criar-usuario -- email "Nome" perfil [senha]` | Cria usuário ou redefine a senha |

## Segurança implementada

- Senhas com bcrypt e sessão em cookie `httpOnly`. O token fica guardado como hash no banco, e o logout encerra a sessão de verdade.
- Limite de 10 tentativas de login a cada 15 minutos por IP.
- Escrita na API só com JSON, o que bloqueia formulários de outros sites (CSRF).
- Content Security Policy, que impede scripts de fora.
- Trocar a senha, desativar o usuário ou mudar o perfil derruba as sessões abertas.
- Gravações em transação: se um item do lote é negado, nada é gravado.
- No Supabase, as tabelas ficam bloqueadas para a API pública (RLS ligado e sem permissão para `anon`/`authenticated`). Só o servidor do sistema acessa os dados.

## Próximos passos sugeridos

- **Campo de obra (CB1/CB2) nos lançamentos.** Hoje o borderô não diz de qual empreendimento é o gasto, por isso o executado é sempre CB1 + CB2. O banco já tem a tabela `empreendimentos`.
- **Editar orçamento e cronograma pela tela.** Os valores já estão no banco (`orcamento` e `cronograma_planejado`), mas por enquanto só mudam direto no banco.
- **Recuperação de senha por e-mail.** Hoje o admin redefine pela tela.
