# AI spikes

Small, standalone experiments for Gimme's AI work. Nothing here touches the app, the database, Clerk or Vercel. All data is **fixture data**: made-up items, not real products or users.

## Embeddings and cosine similarity (`spikes/similarity.py`)

Embeds 30 wishlist-style items, then compares them with cosine similarity written out by hand (`dot(a, b) / (norm(a) * norm(b))`). The spec is [docs/handoffs/embeddings-spike.md](../docs/handoffs/embeddings-spike.md).

### Run it

```sh
cd ai
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt          # Voyage AI
.venv/bin/pip install -r requirements-local.txt    # or: local fallback (pulls in PyTorch)
.venv/bin/python spikes/similarity.py
.venv/bin/python -m unittest discover spikes       # checks the math, no model needed
```

- With `VOYAGE_API_KEY` set in the environment or in `ai/.env` (gitignored), it uses Voyage AI's `voyage-4`. Anthropic has no embedding model of its own and points to Voyage. Items are embedded as `document`, queries as `query`.
- Without a key, it uses `all-MiniLM-L6-v2` locally and says so on the `model:` line.
- Vectors are cached in `ai/.cache/`, keyed by model, input type and text, so reruns don't re-bill and one model's vectors are never reused for another.
- Python 3.12 is what was tested. PyTorch, needed for the local model, lags the newest Python releases.

### Fixtures

- `fixtures/items.json`: 30 items. The first 5 mirror `scripts/seed-test-users.mjs`. It includes 4 **near-duplicates** (the same product worded differently, as if saved from another shop) and 5 **traps** that share a word but not a meaning: headphone jack adapter, camera-shaped night light, coffee table book, runner rug, cookbook stand. `category` is used only to read the results and is never embedded.
- `fixtures/queries.json`: 8 searches typed the way a gift-giver would.
- `fixtures/expected_pairs.json`: 10 checks of the form "anchor should be closer to A than to B". These are the project's first evaluation cases. They were committed before the first run, and failures are explained below, not fixed by editing the file.

### What the output means

1. **Nearest neighbors:** each item's 3 most similar items, embedding title plus note.
2. **Query rankings:** the top 5 items for each search.
3. **Expected pairs:** pass or fail for each check, the score `X/10`, and the same checks using titles only.
4. **Does the note change things?:** for items with a note, how far the note moves the vector (cosine between the title-only and title-plus-note vectors), and whether the 3 nearest neighbors change.
5. **Where is the cutoff?:** score spread for near-duplicate pairs, other same-category pairs and cross-category pairs, plus the highest-scoring cross-category pairs.
6. **Would it catch the same item saved from two shops?:** for each near-duplicate pair, its score, where it ranks among the item's neighbors, and how many non-duplicate pairs score as high or higher.

### Results with the local model (`all-MiniLM-L6-v2`, 384 dimensions)

The Voyage path hasn't been run yet because no key was set. The numbers below are MiniLM's.

**Expected pairs: 6/10 passed.** All 5 trap checks passed: the duplicate beat the shared-word item every time. The 4 failures:

| Check | Scores | Why it failed |
| --- | --- | --- |
| runner rug closer to throw blanket than to runners | 0.197 vs 0.316 | The shared word "runner" outweighs "both are home goods". The model matches surface words when the meaning link (decor) is weak. |
| cookbook closer to skillet than to coffee table book | 0.183 vs 0.280 | "Book" pulls the cookbook toward other books. The cooking link to a skillet, a different kind of object, is weaker. |
| board game closer to jigsaw puzzle than to wooden blocks | 0.164 vs 0.219 | The model groups "games and toys" together and doesn't separate grown-up from kids' play. |
| picture book closer to wooden blocks than to mystery box set | 0.096 vs 0.296 | The same "books stick together" effect: being a book beats being for kids. |

All 4 are the same lesson. A small model groups by **what kind of object** something is (book, game, product name words) more than by **who it's for or what it's used for**. Gift-giving cares about the second.

### Observations

1. **Duplicates stand out, mostly.** Three near-duplicate pairs scored 0.71 to 0.74. Nothing else in the set scored above 0.56. The runners pair ("Everyday Runner, Sage / Bone" against "Women's Everyday Sneaker in Sage Green") scored only 0.450, below two unrelated pairs: e-reader and reading lamp (0.551), and wooden blocks and jigsaw puzzle (0.461). Different words for the same thing ("runner" against "sneaker") cost a lot.
2. **Notes move neighbors but not the score.** Notes changed the nearest neighbors for 7 of the 9 items that have one, and moved vectors to between 0.78 and 0.92 of their title-only versions. The expected-pair score stayed 6/10 either way. Some changes help: the kettle's "For slow weekend coffee" brings the cookbook close. Some hurt: the board game's "For game nights with my partner" makes the cookbook and night light its nearest neighbors. Short, personal notes ("Size 8", "black please") add noise to the item's meaning.
3. **Queries work when the words match.** "Headphones for a long flight" and "something for a coffee lover" ranked sensibly. "Toys for a toddler" put the throw blanket first and the wooden blocks fourth. "Self-care gift for a stressed friend" ranked the bath salts outside the top 5, and nothing scored above 0.27.
4. **Vectors come back unit length.** The norm printed is 1.0000, so for this model cosine and the plain dot product give the same answer. That's a property of this model, not something to assume for others.
5. **Scores are low in absolute terms.** The median cross-category pair is 0.089 and the median same-category pair is 0.171. Only the relative order means anything.

### Answers for the case study

1. **Surprises:** the runners pair scored only 0.450, under unrelated pairs like e-reader and reading lamp (0.551). Bath salts and candle (0.360) passed easily, yet the "self-care" query couldn't find bath salts. The 4 failed checks all came from grouping by object type over purpose.
2. **Notes:** yes for neighbors (7 of 9 changed), no for the expected-pair score (6/10 both ways). Notes that describe use ("for slow weekend coffee") help; notes about size or color are noise. For duplicate detection, embed the title alone; for "gift ideas like this", the note may help.
3. **Cutoff:** for MiniLM on this set, about 0.6 separates 3 of the 4 duplicates from everything else. Nothing non-duplicate scored above 0.56, and 0.6 still misses the runners pair at 0.450. A cutoff only holds for one model, because each model spreads its scores differently: the same pair can score 0.45 in one and 0.8 in another. It also depends on the text format (title only or with note) and on the kind of items. Any cutoff has to be re-measured against labeled pairs whenever the model or the input changes.
4. **Same item from two shops:** partly. Each duplicate was its item's single nearest neighbor (rank 1 in all 4 cases), so "suggest the closest match and ask the owner" would work here. A fixed threshold would not: it either misses the runners pair or flags unrelated pairs. Duplicate detection should combine embeddings with cheaper signals, such as the same product link with tracking parameters removed, or a matching price and shop name, and should ask instead of merging automatically.

### Next

- Rerun with `VOYAGE_API_KEY` set and compare against these MiniLM numbers.
- Add more expected pairs, especially purpose-over-type cases, before trusting any change.
- Proposal only, not built: store vectors with pgvector in an embedding column on `wishlist_items`, with row-level security unchanged and nothing touching `purchases`.
