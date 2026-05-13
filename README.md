# SIG Checklist Operacional

Sistema interno da Sig Multimarcas para criar, preencher e gerar PDF de checklists operacionais 100% personalizaveis.

## O que foi entregue

- Backend Node.js + Express com JWT, perfis, veiculos, modelos de checklist, respostas, upload de fotos, assinaturas e geracao de PDF.
- Banco MySQL com migrations para usuarios, perfis, veiculos, modelos, categorias, perguntas, opcoes, respostas, fotos, assinaturas, relatorios e logs.
- Painel web Next.js 14 + React + Tailwind CSS com login, dashboard, cadastro de veiculos e criador visual de checklists.
- App mobile Expo/React Native com login, listagem de checklists/veiculos, preenchimento dinamico, fotos pela camera, rascunho e finalizacao.
- Seed inicial editavel pelo painel. Nao ha pergunta ou categoria fixa no codigo do fluxo operacional.

## Requisitos

- Node.js 18+
- MySQL 8+
- npm

## Configuracao local

1. Opcionalmente crie o banco no MySQL:

```bash
mysql -u root -p < configurar-mysql.sql
```

2. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Ajuste `DATABASE_URL` e `JWT_SECRET` no `.env`.

Exemplos de `DATABASE_URL`:

```env
DATABASE_URL=mysql://root:sua_senha@localhost:3306/sig_checklist
DATABASE_URL=mysql://sig_user:sig_senha@localhost:3306/sig_checklist
```

4. Instale dependencias:

```bash
npm install --legacy-peer-deps
```

5. Rode migrations e seed. O comando de migration tambem cria o banco `sig_checklist` se ele ainda nao existir:

```bash
npm run db:migrate
npm run db:seed
```

No Windows, voce tambem pode executar `preparar-mysql.bat` e informar a senha do MySQL. Ele atualiza o `.env`, roda migrations e seed.

Login inicial:

- E-mail: `admin@sig.com`
- Senha: `123456`

## Rodando

Backend:

```bash
npm run dev:backend
```

Painel web:

```bash
npm run dev:web
```

Abra `http://localhost:3000`.

App mobile:

```bash
npm run dev:mobile
```

Use Expo Go ou emulador. Em celular fisico, ajuste `EXPO_PUBLIC_API_URL` para o IP da maquina na rede.

## Deploy

### Backend no Railway

O arquivo `railway.json` deixa o Railway pronto para instalar dependencias, rodar migrations e iniciar o backend Express.

1. Crie um projeto no Railway e conecte este repositorio.
2. Adicione um banco MySQL no Railway ou use uma URL externa.
3. Configure as variaveis no servico do backend:

```env
DATABASE_URL=mysql://usuario:senha@host:3306/banco
JWT_SECRET=um-segredo-forte
PORT=4000
```

Se o MySQL do Railway fornecer `MYSQL_URL`, o backend tambem aceita essa variavel automaticamente. O Railway tambem injeta `PORT`; se ele criar essa variavel, mantenha a dele. Depois do deploy, teste:

```text
https://seu-backend.up.railway.app/health
```

### Painel web no Vercel

O arquivo `vercel.json` compila o workspace `web` a partir da raiz do monorepo.

1. Importe este repositorio na Vercel.
2. Mantenha a raiz do projeto como a pasta principal do repositorio.
3. Configure a variavel:

```env
NEXT_PUBLIC_API_URL=https://seu-backend.up.railway.app
```

Depois do deploy, abra a URL da Vercel e faca login com o usuario seed ou com um usuario criado no painel.

### App mobile em producao

Antes de gerar APK apontando para producao, ajuste:

```env
EXPO_PUBLIC_API_URL=https://seu-backend.up.railway.app
```

## Gerando APK Android

Opcao 1: APK local, sem login do Expo:

```bat
gerar-apk-local.bat
```

Esse modo compila no proprio PC e salva o arquivo em `dist\SIG-Checklist.apk`.

Para instalar pelo cabo USB:

```bat
instalar-apk-usb.bat
```

O telefone precisa estar na mesma rede Wi-Fi do computador para acessar o backend. O APK local usa o IP do Wi-Fi do computador, por exemplo `http://192.168.0.149:4000`, em vez de `localhost`.

Opcao 2: APK via Expo EAS Build:

```bat
gerar-apk.bat
```

Ou rode pelo terminal:

```bash
npm run build:apk
```

O gerador usa Expo EAS Build e cria um APK instalavel. Na primeira vez, o Expo pode pedir login/criacao de conta e configuracao do projeto. Ao final do build, o terminal mostra o link para baixar o APK.

## APIs principais

- `POST /auth/login`
- `GET /auth/me`
- `GET /vehicles`
- `POST /vehicles`
- `PUT /vehicles/:id`
- `GET /checklists`
- `GET /checklists/:id`
- `POST /checklists`
- `PUT /checklists/:id`
- `POST /submissions`
- `PUT /submissions/:id/answers`
- `POST /submissions/:id/attachments`
- `POST /submissions/:id/signatures`
- `POST /submissions/:id/finalize`
- `POST /submissions/:id/pdf`
- `GET /submissions/dashboard`

## Regra central

O sistema monta checklists e PDFs a partir das tabelas `checklist_templates`, `checklist_categories`, `checklist_questions` e `checklist_options`. O codigo conhece apenas tipos de resposta e regras genericas; nomes, categorias, perguntas, ordem, obrigatoriedade, fotos, observacoes e opcoes sao dados editaveis pelo painel.
