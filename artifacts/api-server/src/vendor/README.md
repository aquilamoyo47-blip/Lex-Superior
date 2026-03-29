# Vendored Libraries

This directory contains source code vendored from open-source repositories.
These modules are copied locally to avoid external dependencies and network round-trips.

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
