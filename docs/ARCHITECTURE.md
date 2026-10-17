# Arquitetura — FastOne Mobile

App Expo (React Native) único para **entregador** e **gestor/operador**, consumindo a API `nodejs-backend-delivery-manager`.

## Princípios

- **Feature-first + Clean Architecture por módulo.** Cada domínio de negócio (`auth`, `deliveries`, `fleet`, `notifications`…) é um módulo isolado com as mesmas camadas do backend. Times/PRs crescem por módulo sem conflito.
- **Regra de dependência:** as setas apontam para dentro. `presentation → data → domain`; `infra` implementa protocolos de `data`. O `domain` é TypeScript puro. O ESLint (`no-restricted-imports`) quebra o build se alguém violar isso.
- **Composition root único** em `src/main`: é o único lugar que conhece as implementações concretas (fetch, SecureStore, socket). Trocar uma implementação (ex.: axios, MMKV) mexe só ali.
- **Estado de servidor ≠ estado de cliente.** Dados da API vivem no react-query (cache, dedupe, paginação). Zustand guarda só a sessão.
- **Toda resposta da API é validada na borda** (zod nos DTOs + mapper para entidade). Contrato quebrado vira erro tipado, não `undefined` no meio da tela.
- **Regra de autorização fica no backend.** O app só esconde botões.

## Camadas

```
src/
  app/                    rotas do Expo Router (finas: só montam telas de presentation)
  main/                   composition root: env, container de dependências, providers
  core/                   técnico e transversal, sem regra de negócio
    errors/               AppError com `kind` (network, timeout, unauthorized, …)
    http/                 HttpClient (interface) + FetchHttpClient (timeout, retry, refresh)
    storage/              KeyValueStorage (SecureStore no nativo, localStorage no web)
    query/                queryClient + integração AppState/NetInfo
  shared/                 design system (theme, componentes de UI)
  modules/<feature>/
    domain/               entidades, regras puras, contratos de repositório
    data/                 casos de uso (orquestram o domain via protocolos)
    infra/                implementações: HTTP repositories, DTOs (zod), mappers
    presentation/         telas, componentes, hooks (react-query), stores
```

## Robustez e escala

Muitos aparelhos falando com a mesma API exigem que o cliente seja "bem-comportado":

- **Timeout** em toda requisição (AbortController) e cancelamento quando a tela sai.
- **Retry só no que é seguro:** métodos idempotentes, erro de rede/5xx/429, com **backoff exponencial + jitter** (evita que milhares de apps batam juntos após uma queda) e respeito ao `Retry-After`.
- **Refresh de token single-flight:** várias requisições com 401 disparam um único refresh.
- **Paginação** (`useInfiniteQuery`) e listas virtualizadas; nada de "baixar tudo".
- **Tempo real com moderação:** socket invalida cache em vez de recarregar tudo; reconexão com backoff.
- **Offline-aware:** NetInfo alimenta o `onlineManager`; ações bloqueadas sem rede no MVP.

## Fluxo de trabalho

- Branches a partir de `develop`; PR pequeno por etapa; `main` recebe releases.
- `npm run validate` = typecheck + lint + format + testes (o mesmo que o CI roda).
- Plano completo: `delivery-fastOne-front/docs-local/mobile-plan-v2.md`.
