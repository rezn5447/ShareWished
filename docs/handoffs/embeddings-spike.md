# Handoff: embeddings and cosine similarity spike

**For:** a coding agent working in this repo · **Owner:** Rezzy · **Written:** 2026-11-08 · **Branch:** `spike/embeddings`

## Why this exists

Gimme is Rezzy's capstone for forward deployed engineer (FDE) interviews. Later features, like gift ideas and spotting the same item saved from two shops, will rely on embeddings. Before building those, Rezzy needs a small, measurable, hands-on feel for how embeddings and cosine similarity behave on wishlist-style items.

This is a learning and baseline spike, not a product feature. Keep it small and readable. Rezzy should be able to explain every line in an interview.

## Goal

A standalone Python script that embeds about 30 wishlist-style items and prints:

1. The 3 nearest neighbors for each item, with similarity scores.
2. Ranked results for about 8 plain-English queries, like "cozy reading gift for mom".
3. A pass/fail check of about 10 expected comparisons ("A should be closer to B than to C"). These are the project's first eval cases.

## Scope

- **In:** a new `ai/` folder with the script, fixtures and a short README. Python, because the plan moves Gimme's AI work to Python.
- **Out:** no changes to app code, the database, migrations, Supabase, Clerk or Vercel. No real user data. No fetching product pages.

## Rules (from CLAUDE.md and the plan)

- Don't touch surprise mode: the `purchases` table, the security-definer functions, grants or policies.
- Don't read the production database. Use fixtures only.
- Don't commit secrets. Read `VOYAGE_API_KEY` from the environment or from `ai/.env`, and gitignore that file.
- Never present fixture items as real products. Label them as fixtures.
- Comments explain *why*, briefly. Match the repo's existing density.

## Embedding provider

Anthropic doesn't offer its own embedding model; its docs point to Voyage AI ([Anthropic embeddings docs](https://platform.claude.com/docs/en/build-with-claude/embeddings)).

- Use the Voyage Python client with a current general-purpose model. Check docs.voyageai.com for the current name rather than hard-coding one from memory.
- Embed items with `input_type="document"` and queries with `input_type="query"`.
- If no key is set, fall back to `sentence-transformers` with `all-MiniLM-L6-v2` running locally, and say so clearly in the output.
- Print which model ran and the vector length (dimension).

## Steps

1. **Set up `ai/`:** a `requirements.txt` (`voyageai`, `numpy`, `python-dotenv`; `sentence-transformers` optional) and a `.gitignore` covering `.env`, `.venv/` and `.cache/`.
2. **`ai/fixtures/items.json`:** about 30 items. Start with the 5 items from `scripts/seed-test-users.mjs` (studio wireless noise-cancelling headphones, speckled stoneware mug set, the "Slow Sundays" cookbook, the silver instant film camera, the sage everyday runners). Add about 25 more across tech, kitchen, books, outdoors, kids, home, beauty and games. Include:
   - near-duplicates: the same product worded differently or from a different shop
   - traps: items that share words but not meaning, like "headphone jack adapter" next to the headphones
   - Fields: `id`, `title`, optional `note`, and `category`. Category is only for checking results; don't embed it.
3. **`ai/fixtures/queries.json`:** about 8 queries written the way a gift-giver would type them.
4. **`ai/fixtures/expected_pairs.json`:** about 10 checks shaped like `{ "anchor": ..., "closer": ..., "farther": ... }`. For example: anchor "noise-cancelling headphones", closer "wireless earbuds", farther "headphone jack adapter".
5. **`ai/spikes/similarity.py`:**
   - Embed each item as its title plus its note, if it has one.
   - Write cosine similarity out by hand with numpy: `dot(a, b) / (norm(a) * norm(b))`. Don't hide it behind a library call; the point is to see it.
   - Cache embeddings in `ai/.cache/` so reruns don't re-bill.
   - Print the model and dimension, neighbors, query rankings, and `expected pairs: X/10 passed`, listing the failures.
6. **`ai/README.md`:** how to run it, what each section of output means, and 3–5 observations.
7. **Run it** and paste the output into the pull request description.

## Done when

- `python ai/spikes/similarity.py` runs from a clean checkout with one environment variable set (or none, using the local fallback).
- The output shows the model, the dimension, neighbors, query rankings and the expected-pair score.
- Failed checks are explained in the README, not hidden and not "fixed" by editing the expectations.
- A pull request from `spike/embeddings` into `main` changes nothing outside `ai/` and this handoff file.

## Answer these in the pull request

They feed Rezzy's case study:

1. Which pairs surprised you by scoring higher or lower than expected?
2. Does including the note change the results?
3. What score looks like a sensible "related" cutoff for this model, and why does that cutoff only hold for this model?
4. Would this catch the same item saved from two different shops?

## Later, not in this spike

Storing vectors in Supabase with the `vector` (pgvector) extension, an embedding column on `wishlist_items`, and a similarity function. Any of that must keep row-level security intact and must never touch `purchases`. If you get there, write a proposal only. Don't apply migrations.
