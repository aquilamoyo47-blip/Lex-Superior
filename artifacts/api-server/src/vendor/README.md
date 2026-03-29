# Vendored Libraries

This directory contains source code vendored from open-source repositories.
These modules are copied locally to avoid external dependencies and network round-trips.

## Original 10 Modules

| Module | Source | License | Vendored Version |
|--------|--------|---------|-----------------|
| `fuzzy-search.ts` | https://github.com/krisk/Fuse (Fuse.js) | Apache-2.0 | ~7.x core |
| `lru-cache.ts` | https://github.com/isaacs/node-lru-cache | ISC | ~10.x core |
| `nlp-entity.ts` | https://github.com/spencermountain/compromise | MIT | ~14.x core patterns |
| `sentence-splitter.ts` | https://github.com/nicktindall/cyclic-swd / SBD | MIT | custom port |
| `token-counter.ts` | https://github.com/dqbd/tiktoken / cl100k patterns | MIT | simplified |
| `markdown-parser.ts` | https://github.com/markedjs/marked | MIT | ~12.x core |
| `p-limit.ts` | https://github.com/sindresorhus/p-limit | MIT | ~6.x core |
| `circuit-breaker.ts` | https://github.com/nicolo-ribaudo/opossum / cockatiel patterns | MIT | custom port |
| `pdf-parser.ts` | https://github.com/mozilla/pdf.js text-extraction core | Apache-2.0 | minimal port |
| `text-utils.ts` | https://github.com/component/words / various | MIT | custom |

## New 20 AI-Enhancing Modules

| Module | Source | License | Purpose |
|--------|--------|---------|---------|
| `legal-citation-parser.ts` | https://github.com/freelawproject/eyecite (BSD-2) + Lawmirror | BSD-2 | Parse Zimbabwe-style legal citations (case names, statute refs, section numbers) from free text. Hooks into NLP entity extractor and AI quality review pipeline. |
| `date-parser.ts` | https://github.com/wanasit/chrono | MIT | Extract and normalise legal dates (judgment dates, filing deadlines, limitation periods) from document text. |
| `keyword-extractor.ts` | https://github.com/NaturalNode/natural | MIT | TF-IDF–based keyword extraction to surface top legal keywords from any document chunk. Used in the RAG context-building step. |
| `stopwords.ts` | https://github.com/fergiemcdowall/stopword | MIT | Legal-domain + general English stopword corpus as a plain TypeScript constant. Used by keyword extractor and BM25 scorer. |
| `porter-stemmer.ts` | https://github.com/NaturalNode/natural | MIT | Porter stemmer algorithm to normalise legal term variants (e.g., "pleading" → "plead"). Feeds into BM25 and TF-IDF modules. |
| `bm25.ts` | https://github.com/winkjs/wink-bm25-text-search | MIT | Okapi BM25 ranking algorithm to rank knowledge base chunks by relevance. Replaces/augments fuzzy search in the RAG retrieval step. |
| `tfidf-vectoriser.ts` | https://github.com/NaturalNode/natural | MIT | TF-IDF document vectorisation to score document similarity. Used alongside BM25 for hybrid retrieval. |
| `cosine-similarity.ts` | https://github.com/mljs/distance | MIT | Cosine similarity function to compare TF-IDF / embedding vectors. Used by TF-IDF vectoriser and semantic search. |
| `text-chunker.ts` | https://github.com/langchain-ai/langchainjs | MIT | Recursive character / paragraph text-splitting to break long legal documents into RAG-ready chunks with configurable overlap. |
| `trie.ts` | https://github.com/nicktindall/trie-search | MIT | Compact Trie implementation to power statute and case-name autocomplete in the chat UI's typeahead suggestions. |
| `docx-parser.ts` | https://github.com/mwilliamson/mammoth.js | BSD-2-Clause | Extract plain text from uploaded `.docx` files, complementing the existing PDF parser. |
| `html-to-text.ts` | https://github.com/html-to-text/node-html-to-text | MIT | Strip and format HTML pages scraped from ZimLII before feeding into the RAG pipeline. |
| `table-extractor.ts` | https://github.com/mafintosh/csv-parser patterns | MIT | Pull structured data (e.g., court fee tables, limitation period tables) from legal documents. |
| `text-highlighter.ts` | https://github.com/julmot/mark.js | MIT | Produce annotated excerpts when returning RAG source references to the user. |
| `retry-backoff.ts` | https://github.com/sindresorhus/p-retry | MIT | Exponential-backoff-with-jitter to wrap all outbound AI API calls; supplements the existing circuit breaker. |
| `event-emitter.ts` | https://github.com/primus/eventemitter3 | MIT | Typed, zero-dependency event bus for streaming AI responses chunk-by-chunk to the frontend via SSE. |
| `token-bucket.ts` | https://github.com/jhurliman/node-rate-limiter | MIT | Token bucket algorithm to enforce per-user and per-provider request quotas, preventing API overage and abuse. |
| `levenshtein.ts` | https://github.com/hiddentao/fast-levenshtein | MIT | Optimised edit-distance algorithm for approximate matching of statute names and case citations when users make typos. |
| `priority-queue.ts` | https://github.com/qiao/heap.js | MIT | Binary min-heap priority queue to rank and merge results from BM25, TF-IDF, and fuzzy search into a single ordered hit list. |
| `text-diff.ts` | https://github.com/kpdecker/jsdiff | BSD-3-Clause | Myers diff algorithm to compare document versions in the Vault and show what changed between uploaded revisions. |
