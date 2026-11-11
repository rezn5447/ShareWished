# Handoff: AI gift suggestions

Status: not started. Written 2026-11-11 to kick off the work the week of 2026-11-16.

## Goal

Suggest gifts from what's already on a wishlist, using Claude with tool calling and retrieval over saved
items. Two outcomes matter equally:

1. A feature people use: suggestions good enough that someone adds one to a list.
2. Public proof of three skills for forward deployed engineering roles: **AI agents** (a model choosing and
   calling tools), **RAG** (retrieval feeding the prompt) and **LLM API** work, plus **evals** (measuring it).
   That proof has to be visible in this repo's code, README and topics, and the resume bullet needs a real
   number from it (see "Measure it").

## Start here (next session)

1. Load the `claude-api` skill before writing any Claude code. It has the current model IDs, the TypeScript
   tool runner and the structured-output helpers. Don't write SDK calls from memory: the API changed in 2026.
2. Read `CLAUDE.md`, especially "Surprise mode" and "Link previews". Both constrain this feature.
3. Read the Next 16 docs in `node_modules/next/dist/docs/` for route handlers before adding `app/api/...`.
4. Settle the open decisions below (brainstorm them), then write the plan.

## Open decisions

| Decision | Options | Lean |
|---|---|---|
| Who sees suggestions | **Owner**: "ideas to add to my list". **Gifter**: "something like this, in my budget" | Owner first. It reads only the owner's own items, so surprise mode is untouched. Gifter side later, with a test that the owner path never sees it |
| Retrieval | **pgvector + embeddings** over items (title, note, retailer); or Postgres full-text search | pgvector: real RAG, and it also proves Embeddings / Vector databases. Anthropic has no embeddings endpoint, so pick a provider (Voyage AI, or Supabase's built-in `gte-small` in an Edge Function) |
| Where product ideas come from | Model knowledge only; or the `web_search` server tool for real, current products | Web search, so suggestions link to real products. Then reuse `/api/link-preview` to fill price and image, which already guards against SSRF |
| Model | The skill's default is `claude-opus-5-5` | Start there; cost and speed tuning (effort, a smaller model) is your call after measuring |

## Shape (owner side)

- `app/api/suggestions/route.ts`: signed-in only (add it to `proxy.ts`), server-side, `ANTHROPIC_API_KEY` from
  the environment (never `NEXT_PUBLIC_`). Rate-limit per user.
- An agent loop with the TypeScript SDK's tool runner (`betaZodTool` + `client.beta.messages.toolRunner`).
  Tools, each a thin wrapper over code that already exists or a new query:
  - `search_saved_items(query)`: vector search over the caller's own items, run with the caller's Clerk token
    so RLS applies. This is the retrieval step.
  - `get_list(listId)`: the list's occasion, date, note and items (owner view: never purchase data).
  - `web_search` (server tool) for current products; `preview_link(url)` to price one through the existing
    link-preview code.
- Final answer as structured output (Zod schema): `suggestions[]` with `title`, `why` (which saved items it
  matches), `estPrice`, `url`.
- Treat item notes and fetched pages as untrusted data in the prompt, not instructions.
- UI: a "Get ideas" action on the owner's list that opens a bottom `Sheet` (repo convention); each suggestion
  has an "Add to list" button that goes through `addItem`.

## Data and migration

- Enable `vector`; add an embedding column (or a side table) for `wishlist_items`, filled when items are added
  and backfilled once. Write the migration re-runnable, like the others.
- Add a `suggestion_log` table modeled on `link_previews`: what was suggested, from which list, and whether
  it was added. RLS: the caller writes their own rows.
- After the schema change: regenerate `lib/supabase/database.types.ts`, then run the security and
  performance advisors (see CLAUDE.md).

## Measure it (this is the resume number)

- Acceptance rate: suggestions added to a list ÷ suggestions shown, from `suggestion_log`. Add the query to
  `supabase/queries/usage.sql`.
- A small offline eval: 20 to 30 saved lists (seed users' data, nothing real) with a grader for "relevant to
  the list" and "within the list's price range". Run it before and after prompt changes. The `claude-api`
  skill's `build-eval` flow walks through this.

## Tests

- Unit tests for each tool function and the schema.
- Playwright e2e with the model call stubbed at the route (no API spend in CI): the sheet opens, suggestions
  render, "Add to list" adds the item.
- Run `npx playwright test surprise-mode` after any change near list reads.

## When it ships

- README: a section on how suggestions work, naming the agent loop (tool calling), RAG over saved items with
  pgvector embeddings, the Claude (Anthropic) API and the eval. Add repo topics: `anthropic`, `ai-agents`,
  `rag`, `pgvector`, `llm`.
- Resume bullet (Projects), with the measured number, for example: "Built AI gift suggestions for Gimme: a
  Claude tool-calling agent with RAG over saved items (pgvector), [N]% of suggestions added to lists,
  checked by an eval of [N] lists."

## Outside the repo (checklist)

| Where | Local | Production (Vercel `gimme`) |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local` | Vercel project env, Production and Preview |
| Embeddings provider key (if not Supabase built-in) | `.env.local` | Vercel env |
| Migration: `vector` + embeddings + `suggestion_log` | Supabase project (check live state first, per CLAUDE.md) | same project |
| Backfill embeddings for existing items | one-off script | run once after deploy |
| Spend limit on the Anthropic key | Console | Console |
