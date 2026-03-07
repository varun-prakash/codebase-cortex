# Codebase Cortex

Local-first TypeScript codebase indexing and semantic search with:

- **Semantic Embeddings** — Ollama embeddings (nomic-embed-text) with deterministic fallback
- **ChromaDB Storage** — Persistent vector database
- **AST-aware Indexing** — Extracts functions, classes, methods, interfaces  
- **Hybrid Retrieval** — Vector similarity + symbol name keyword boosting
- **Optional LLM Refinement** — Ollama integration with strict anti-hallucination guardrails
- **Grounded Answers** — No speculation, all facts from retrieved code

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Ollama Server

In a separate terminal, run Ollama with the required models:

```bash
ollama serve
```

In another terminal, pull the models we're using:

```bash
# For semantic embeddings (required)
ollama pull nomic-embed-text

# For LLM refinement (optional, only needed with --refine)
ollama pull deepseek-coder
```

**Models used:**
- `nomic-embed-text` — 384-dimensional semantic embeddings for retrieval
- `deepseek-coder` — LLM for optional answer refinement (reasoning, explanation)

### 3. Start ChromaDB

In another terminal, run ChromaDB at the default location:

```bash
chroma run --path ./data/chroma
```

This creates a persistent vector database in `./data/chroma/`.

### 4. Query the Codebase

```bash
# Basic deterministic query (uses Ollama embeddings, ChromaDB storage)
npm run dev -- query "explain the whole project"

# With LLM refinement (makes output more natural/verbose)
npm run dev -- query "explain the whole project" --refine

# For testing without real Ollama (uses mock LLM)
npm run dev -- query "explain the whole project" --mock-llm
```

---

## 📖 Usage Examples

### Index a Codebase
```bash
# Automatically indexes src/ directory
npm run dev -- index /path/to/src
```

### Run Queries

**Deterministic (grounded only):**
```bash
npm run dev -- query "where is indexing handled"
npm run dev -- query "find functions that parse files"
npm run dev -- query "what types are defined"
```

**With LLM Refinement (more natural language):**
```bash
npm run dev -- query "explain the flow" --refine
npm run dev -- query "what does the indexer do" --refine
```

**Mock LLM Mode (testing, no Ollama required):**
```bash
npm run dev -- query "test query" --mock-llm
```

---

## 🏗️ Architecture

```
User Query
    ↓
Indexer (AST scan + symbol extraction from TypeScript files)
    ↓
Chunks: { symbolName, filePath, source, startLine, endLine, type }
    ↓
Embeddings (Ollama nomic-embed-text → 384-dim vectors)
    ↓
ChromaDB Vector Store (persistent storage)
    ↓
Hybrid Retrieval (cosine similarity + symbol name keyword boosting)
    ↓
Generator (compose grounded answer from retrieved chunks)
    ↓
[Optional] Refiner (enhance with Ollama deepseek-coder LLM)
    ↓
Output: Answer + citations (or "Insufficient context")
```

---

## 🔧 Project Structure

```
src/
├── cli/
│   ├── index.ts                  # Main CLI (index, query commands)
│   ├── example.ts                # Example: deterministic mode
│   └── example-with-llm.ts       # Example: with mock LLM
├── parser/
│   └── astParser.ts              # AST extraction (functions, classes, etc)
├── indexer/
│   └── indexer.ts                # Indexer: scans directory & extracts symbols
├── embeddings/
│   └── embeddings.ts             # Ollama semantic embeddings + fallback
├── retriever/
│   └── vectorStore.ts            # In-memory + ChromaDB vector store
├── generator/
│   └── generator.ts              # Grounded answer generator
├── generator/
│   └── refiner.ts                # Optional LLM refinement
├── llm/
│   └── llmProvider.ts            # Ollama integration + mock provider
├── types/
│   └── index.ts                  # Core interfaces
└── ... (other modules)

tests/
├── unit/
│   ├── embeddings.test.ts        # Embedding tests
│   ├── astParser.test.ts         # Parser tests
│   ├── vectorStore.test.ts       # Retrieval tests
│   ├── generator.test.ts         # Generation tests
│   └── refiner.test.ts           # Refinement tests
└── integration.test.ts           # Integration test

data/
└── chroma/                       # ChromaDB persistent storage
```

---

## � Commands

### CLI Commands

```bash
# Index a directory
npm run dev -- index /path/to/src

# Query (deterministic only)
npm run dev -- query "your question"

# Query with LLM refinement
npm run dev -- query "your question" --refine

# Query with mock LLM (testing)
npm run dev -- query "your question" --mock-llm
```

### Development Commands

```bash
# Run examples
npm run example              # Deterministic mode
npm run example:llm         # With mock LLM refinement

# Run tests
npm test                    # All unit tests (64 tests)
npm run test:watch        # Watch mode
npm run test:integration  # Integration test

# Build
npm run build             # TypeScript → JavaScript
```

---

## �️ Anti-Hallucination Features

1. **Grounded Only** — Answers contain only code from retrieval
2. **Explicit "Insufficient Context"** — Returns exact message when needed
3. **Semantic Embeddings** — Ollama provides better understanding than hashing
4. **Strict LLM Guardrails** — Refinement prompt includes fact-checking rules
5. **Graceful Fallback** — If Ollama unavailable, uses deterministic embeddings or returns grounded answer

---

## 🔗 External Services Required

| Service | Command | Models | Purpose |
|---------|---------|--------|---------|
| **Ollama** | `ollama serve` | `nomic-embed-text`, `deepseek-coder` | Embeddings + optional refinement |
| **ChromaDB** | `chroma run --path ./data/chroma` | — | Persistent vector storage |

---

## 📊 Output Example

```
npm run dev -- query "what is the generator"

[cli] querying with deterministic grounded generator...

[indexer] scanning rootDir: /Users/varunprakash/Projects/codebase-cortex/src
[indexer] files found: 20
[indexer] generator/generator.ts -> 5 symbol(s) extracted
...
[indexer] total chunks: 55

[vectorstore] retrieval results:
  - src/generator/generator.ts generateAnswerFromQueryAsync score=0.8234 boosted=true
  - src/generator/refiner.ts AnswerRefiner score=0.7156 boosted=false
  ...

========== ANSWER ==========

Answer grounded in 5 retrieved chunk(s):

Function generateAnswerFromQueryAsync: export async function generateAnswerFromQueryAsync(...) 
(defined in src/generator/generator.ts lines 21-140). Class AnswerRefiner: export class AnswerRefiner { ... 
(defined in src/generator/refiner.ts lines 10-95). ...

---
Symbol: generateAnswerFromQueryAsync
File: src/generator/generator.ts (lines 21-140)
Type: function
Score: 0.8234 boosted=true

```ts
export async function generateAnswerFromQueryAsync(
  query: string,
  store: InMemoryVectorStore,
  opts: GeneratorOptions = {}
): Promise<string> {
  const debug = opts.debug ?? false
  const topK = opts.topK ?? 5
  const minScore = opts.minScore ?? 0.02

  // Use semantic embeddings from Ollama
  const qemb = await embedTextOllama(query)
  const results = store.retrieveWithQueryText(query, qemb, { topK, keywordBoost: opts.keywordBoost })
  
  // Generate grounded answer
  if (!results || results.length === 0 || results[0].score < minScore) {
    return 'Insufficient context to answer'
  }
  
  // ... rest of implementation
}
```

---
[more chunks with code excerpts...]
```

---

## 🧪 Testing

Run 64 unit tests:
```bash
npm test
```

Watch mode for development:
```bash
npm run test:watch
```

All tests passing:
```
Test Files  5 passed (5)
Tests       64 passed (64)
Duration    3.16s
```

---

## ⚡ Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Index src/ (20 files) | ~5-10s | First time with Ollama embeddings |
| Query | ~1-2s | Ollama semantic similarity |
| Query + Refinement | ~3-5s | Includes LLM response time |
| Full test suite | ~3.5s | 64 unit tests |

---

## 🎯 Key Features

✅ **Semantic Embeddings** — Ollama nomic-embed-text (384-dim vectors)  
✅ **Persistent Storage** — ChromaDB for reproducible results  
✅ **AST-aware Parsing** — Extracts all symbol types with metadata  
✅ **Hybrid Retrieval** — Vector + keyword matching  
✅ **Grounded Answers** — No hallucination, explicit fallback  
✅ **Optional Refinement** — LLM enhancement with strict guardrails  
✅ **Human-readable Output** — Summaries + code excerpts  
✅ **Comprehensive Tests** — 64 unit tests + integration test  

---

## 🚨 Troubleshooting

### ChromaDB connection refused
```bash
# Make sure ChromaDB is running in another terminal
chroma run --path ./data/chroma
```

### Ollama not available
```bash
# Start Ollama server in another terminal
ollama serve

# Or use mock LLM for testing (doesn't require Ollama)
npm run dev -- query "test" --mock-llm
```

### Model not found
```bash
# Pull the required models
ollama pull nomic-embed-text
ollama pull deepseek-coder
```

### Clear ChromaDB data
```bash
rm -rf ./data/chroma
# Then restart: chroma run --path ./data/chroma
```

---

## 📝 Configuration

### Change Ollama embedding model
Edit `src/embeddings/embeddings.ts`:
```typescript
const EMBED_MODEL = 'nomic-embed-text' // change to another model
```

### Change LLM for refinement
Edit `src/llm/llmProvider.ts`:
```typescript
const MODEL = 'deepseek-coder:latest' // change to another model
```

### Change ChromaDB path
Edit `src/retriever/chroma.ts`:
```typescript
const CHROMA_HOST = 'http://localhost:8000' // or path
```

---

## 📄 License

ISC

---

**Status:** ✅ Production Ready  
**Last Updated:** March 7, 2026  
**Version:** 1.0.0
```
