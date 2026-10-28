<div align="center">

# FastOne Mobile

**App de operação de entregas do FastOne, para entregadores e gestores.**

[![CI](https://github.com/joabesimao/delivery-fastOne-mobile/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/joabesimao/delivery-fastOne-mobile/actions/workflows/ci.yml)
![Expo SDK](https://img.shields.io/badge/Expo_SDK-58-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/status-em_desenvolvimento-F79009)

</div>

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Começando](#começando)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Qualidade e testes](#qualidade-e-testes)
- [Como contribuir](#como-contribuir)
- [Projetos relacionados](#projetos-relacionados)

## Visão geral

O FastOne Mobile é o app do ecossistema **FastOne**, que gerencia pedidos e entregas de uma rede de unidades. Um único app atende dois perfis, e o perfil da conta decide quais telas aparecem:

| Perfil                | Quem é                             | O que faz no app                                                                                                   |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Entregador**        | `entregador`                       | Vê só as próprias entregas, atualiza o status, envia foto de comprovante e registra abastecimento e troca de óleo. |
| **Gestor / operador** | `admin`, `gerente_estoque`, `user` | Acompanha os indicadores da unidade, filtra entregas, reatribui entregadores e conversa pelo chat em tempo real.   |

O app consome a API [`nodejs-backend-delivery-manager`](https://github.com/joabesimao/nodejs-backend-delivery-manager) (REST + Socket.IO). Cadastros, relatórios e exportações continuam no painel web.

## Funcionalidades

O desenvolvimento acontece em fases, com um PR pequeno para cada etapa.

**F0: Fundação**

- [x] Projeto Expo SDK 58 com Expo Router, TypeScript strict e CI
- [x] Cliente HTTP resiliente (timeout, retry com backoff, renovação de token)
- [x] Armazenamento seguro da sessão (Keychain/Keystore)
- [ ] Login, logout e restauração de sessão
- [ ] Navegação protegida por perfil (entregador × gestor)

**F1: Operação do entregador**

- [ ] Minhas entregas: lista paginada, detalhe, ligar para o cliente e abrir no mapa
- [ ] Mudança de status com atualização otimista
- [ ] Frota: meu veículo, abastecimento e troca de óleo
- [ ] Atualização em tempo real via Socket.IO

**F2: Piloto**

- [ ] Push notifications (Expo + FCM/APNs) com deep link
- [ ] Foto de comprovante de entrega

**F3: Release 1.0**

- [ ] Abas do gestor: painel, entregas da unidade, chat e avisos
- [ ] Cache persistido e suporte offline

## Stack

| Área               | Tecnologia                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Plataforma         | [Expo](https://expo.dev) SDK 58 · React Native 0.88 · React 19                                   |
| Navegação          | [Expo Router](https://docs.expo.dev/router/introduction/) (rotas por arquivo, `Stack.Protected`) |
| Linguagem          | TypeScript 6 em modo strict (`noUncheckedIndexedAccess`)                                         |
| Estado do servidor | [TanStack Query](https://tanstack.com/query)                                                     |
| Estado do cliente  | [Zustand](https://zustand.docs.pmnd.rs) (só a sessão)                                            |
| Validação          | [Zod](https://zod.dev) nas fronteiras com a API                                                  |
| Armazenamento      | `expo-secure-store` (nativo) · `localStorage` (web)                                              |
| Conectividade      | `@react-native-community/netinfo`                                                                |
| Testes             | Jest · `jest-expo` · Testing Library                                                             |
| Qualidade          | ESLint (`eslint-config-expo`) · Prettier · GitHub Actions                                        |

## Arquitetura

O app segue **Clean Architecture organizada por feature**. Cada área de negócio (`auth`, `deliveries`, `fleet`…) é um módulo isolado, com as mesmas camadas do backend:

```
src/
├── app/            Rotas do Expo Router. Finas: só montam as telas.
├── main/           Composition root: env, injeção de dependências, providers.
├── core/           Infraestrutura transversal, sem regra de negócio.
│   ├── errors/     AppError tipado por situação (rede, 401, 409, 429…).
│   ├── http/       HttpClient + FetchHttpClient (timeout, retry, refresh).
│   └── storage/    KeyValueStorage (SecureStore / localStorage).
├── shared/         Design system: tema e componentes de UI.
└── modules/
    └── <feature>/
        ├── domain/         Entidades e contratos. TypeScript puro.
        ├── data/           Casos de uso.
        ├── infra/          Repositórios HTTP, DTOs (zod) e mappers.
        └── presentation/   Telas, componentes, hooks e stores.
```

**Regra de dependência:** as dependências apontam para dentro: `presentation → data → domain`, e `infra` implementa os contratos. O ESLint quebra o build se alguém importar na direção errada.

### Decisões de robustez

O app foi pensado para muitos aparelhos acessando a mesma API sem sobrecarregá-la:

- **Timeout e cancelamento** em toda requisição. Sair da tela cancela o que estava pendente.
- **Retry só no que é seguro repetir:** métodos idempotentes, falha de rede, 5xx e 429. A espera cresce a cada tentativa e tem um componente aleatório (_full jitter_), para que os apps não voltem todos ao mesmo tempo depois de uma queda. O `Retry-After` do servidor é respeitado.
- **Renovação de token única:** várias requisições que recebem 401 ao mesmo tempo disparam um único refresh.
- **Erros tipados:** a UI decide pelo tipo do erro (`conflict`, `rate_limited`…), não por texto, e mostra mensagens em português.
- **Contratos validados:** a resposta da API passa por zod antes de virar entidade. Uma quebra de contrato aparece como erro explícito, não como `undefined` na tela.
- **Autorização no backend:** o app só esconde ações. Quem decide o que cada perfil pode fazer é a API.

Os detalhes e o porquê de cada escolha estão em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Começando

### Pré-requisitos

- **Node.js 22+** e npm
- A API [`nodejs-backend-delivery-manager`](https://github.com/joabesimao/nodejs-backend-delivery-manager) rodando localmente
- Um celular com o app **Expo Go**, ou um emulador Android/iOS

> Push notifications e outros módulos nativos exigem um _development build_ (`eas build --profile development`). Eles não funcionam no Expo Go.

### Instalação

```bash
git clone https://github.com/joabesimao/delivery-fastOne-mobile.git
cd delivery-fastOne-mobile
npm ci
cp .env.example .env.local
```

Edite o `.env.local` com o IP da sua máquina na rede local (veja abaixo) e rode:

```bash
npm start
```

Escaneie o QR code com o Expo Go, ou pressione `a` (Android) ou `i` (iOS) para abrir no emulador.

## Variáveis de ambiente

As variáveis com prefixo `EXPO_PUBLIC_` são embutidas no bundle. **Nunca coloque segredos nelas.**

| Variável                 | Exemplo                        | Descrição                                                                     |
| ------------------------ | ------------------------------ | ----------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`    | `http://192.168.0.10:3000/api` | URL base da API REST                                                          |
| `EXPO_PUBLIC_SOCKET_URL` | `http://192.168.0.10:3000`     | URL do servidor Socket.IO                                                     |
| `APP_VARIANT`            | `development`                  | `development`, `preview` ou `production`. Define o nome e o bundle id do app. |

> No celular, `localhost` aponta para o próprio aparelho. Use o IP da máquina onde a API está rodando.

## Scripts

| Comando                           | O que faz                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `npm start`                       | Inicia o servidor de desenvolvimento do Expo                                  |
| `npm run android` / `ios` / `web` | Abre direto na plataforma escolhida                                           |
| `npm run typecheck`               | Checagem de tipos (`tsc --noEmit`)                                            |
| `npm run lint`                    | ESLint, incluindo as regras entre camadas                                     |
| `npm run format`                  | Formata o código com Prettier                                                 |
| `npm test`                        | Roda os testes                                                                |
| `npm run test:watch`              | Testes em modo watch                                                          |
| `npm run validate`                | Typecheck, lint, formatação e testes com cobertura: **o mesmo que o CI roda** |

## Qualidade e testes

- Os testes ficam ao lado do código (`*.test.ts`).
- As dependências são injetadas (`fetch`, `sleep`, `random`), então dá para testar retry, timeout e refresh de forma determinística, sem rede.
- O CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) roda em todo PR e push para `develop` e `main`, nesta ordem: typecheck → lint → format → testes com cobertura → `expo-doctor`.

Antes de abrir um PR:

```bash
npm run validate
```

## Como contribuir

1. Crie a branch a partir de `develop`: `feat/…`, `fix/…`, `chore/…` ou `docs/…`.
2. Faça commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/), por exemplo `feat(auth): adicionar login`.
3. Mantenha os PRs pequenos e focados em uma etapa, sempre com testes.
4. Abra o PR para `develop`. A `main` recebe só releases.

Ao mexer em APIs do Expo, consulte a documentação **da versão do SDK em uso** (veja [`AGENTS.md`](AGENTS.md)). O Expo muda bastante entre versões.

## Projetos relacionados

| Projeto                                                                                            | Descrição                                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`nodejs-backend-delivery-manager`](https://github.com/joabesimao/nodejs-backend-delivery-manager) | API REST + Socket.IO (Node.js, Express, Prisma, MySQL) |
| `delivery-fastOne-front`                                                                           | Painel web administrativo                              |

---

<div align="center">
Desenvolvido por <a href="https://github.com/joabesimao">Joabe Simão</a>
</div>
