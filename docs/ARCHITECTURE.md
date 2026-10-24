# Arquitetura — FastOne Mobile

App Expo (React Native) único para **entregador** e **gestor/operador**, consumindo a API `nodejs-backend-delivery-manager`.

## Princípios

- **Feature-first + Clean Architecture por módulo.** Cada domínio de negócio (`auth`, `deliveries`, `fleet`, `notifications`…) é um módulo isolado com as mesmas camadas do backend. Times/PRs crescem por módulo sem conflito.
- **Regra de dependência:** as setas apontam para dentro. `presentation → data → domain`; `infra` implementa protocolos de `data`. O `domain` é TypeScript puro. O ESLint (`no-restricted-imports`) quebra o build se alguém violar isso.
- **Composition root único** em `src/main`: é o único lugar que conhece as implementações concretas (fetch, SecureStore, socket). Trocar uma implementação (ex.: axios, MMKV) mexe só ali.
- **Estado de servidor ≠ estado de cliente.** Dados da API vivem no react-query (cache, dedupe, paginação). A sessão vive no `SessionManager` (fonte única), lido pela UI com `useSyncExternalStore`.
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
  shared/                 design system (tema claro/escuro, UI, inputs, gráficos, exportação)
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
- **Paginação** (`useInfiniteQuery`) onde a API pagina (avisos) e listas virtualizadas.
- **Tempo real com moderação:** socket invalida cache em vez de recarregar tudo; reconexão com backoff.
- **Offline-aware:** NetInfo alimenta o `onlineManager`; ações bloqueadas sem rede no MVP.

## Rotas e perfis

```
src/app/
  login.tsx                      só sem sessão
  index.tsx                      redireciona: entregador → /deliveries, gestor → /dashboard
  (tabs)/                        abas; Tabs.Protected esconde as de outro perfil
    dashboard chat more          gestor (admin, gerente_estoque, user); "more" = menu lateral do web
    fleet profile                entregador
    deliveries notifications     todos
  delivery/[id]  fuel-refill  oil-change  settings/appearance      todos
  search  new-delivery  clients/  products/  deliverymen/  vehicles/
  cities  neighborhoods  fuel-refills  oil-changes  reports/  chat-search   gestor
  users/  broadcast              admin
  settings/fleet                 admin e gerente de estoque
```

Os guardas de rota espelham os grupos de papéis do backend (`src/main/config/roles.ts`)
em `modules/auth/domain/Session.ts` (`canOperate`, `isFleetManager`, `isAdmin`). É só para
não mostrar o que vai dar 403: quem bloqueia é a API.

## Paridade com o painel web

| Web                                                    | Mobile                                         |
| ------------------------------------------------------ | ---------------------------------------------- |
| Dashboard (KPIs, desempenho, ranking, últimas)         | aba Painel                                     |
| Lista de clientes / Cadastrar cliente                  | Mais → Clientes                                |
| Lista / Cadastrar produto (imagem, variações)          | Mais → Produtos                                |
| Relatórios do dashboard / das entregas / ranking (CSV) | Mais → Relatórios                              |
| Realizar entrega (folha A4/térmica)                    | Mais → Realizar entrega, botão na aba Entregas |
| Finalizar entrega / listagem com filtros               | aba Entregas + detalhe                         |
| Entregadores, veículos, cidades, bairros               | Mais → Cadastros                               |
| Abastecimento / troca de óleo (listas, edição)         | Mais → Cadastros; entregador na aba Frota      |
| Usuários (staff)                                       | Mais → Usuários (admin)                        |
| Configurações visuais / de frota                       | Aparência / Configurações de frota             |
| Chat (imagem, apagar, busca)                           | aba Chat                                       |
| Sino de avisos + Enviar aviso                          | aba Avisos (+ botão do admin)                  |
| Busca global do cabeçalho                              | ícone de busca no Painel e em Entregas         |

Ficaram de fora o modal de perfil (foto, apelido) e a troca de unidade: no web eles
importam hooks que não existem no repositório, e o backend não tem `/me` nem rota de unidade.
O estoque "Em estoque / Apenas N un" da lista de produtos do web é dado de exemplo e também não veio.

## Adaptações à API atual

O app usa a API como ela está hoje. Enquanto os PRs do backend do plano não saem:

- **Sem `/me` e sem vínculo conta → entregador.** Nome e perfil vêm da resposta do `/login`; o id da conta vem do evento `session:ready` do socket. O entregador escolhe "meu veículo" uma vez (salvo no aparelho), e o `deliverymanId` desse veículo separa as entregas dele **na tela**. A API ainda devolve todos os pedidos da unidade (falha 1 do plano): esconder no app não é controle de acesso.
- **Sem paginação em `/orderDelivery`.** A lista vem inteira e é filtrada no aparelho, com `FlatList` virtualizada. O relatório de entregas é calculado sobre essa lista, como no web.
- **Status:** só avança (`actived → delivered → finished`). O PUT de "finalizar" não é repetido automaticamente, porque o backend responde 409 para `finished → finished`.
- **Listas vazias respondem 204** (`/client`, `/register`): o repositório trata como lista vazia.
- **Produtos** são paginados em até 100; o app busca todas as páginas.
- **Imagens** (chat e produto) vão em base64; o app reduz para 1280 px em JPEG antes de enviar, porque a API recusa acima de 5 MB.
- **Push e foto de comprovante** dependem dos PRs 5 a 8 do backend e de um _development build_.

## Fluxo de trabalho

- Branches a partir de `develop`; PR pequeno por etapa; `main` recebe releases.
- `npm run validate` = typecheck + lint + format + testes (o mesmo que o CI roda).
- Plano completo: `delivery-fastOne-front/docs-local/mobile-plan-v2.md`.
