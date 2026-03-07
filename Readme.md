# Codebase Cortex

A deterministic, local-first CLI tool for indexing and querying TypeScript codebases using:

- AST-aware symbol extraction (TypeScript Compiler API)
- Deterministic embeddings (local hashing-based vectors)
- In-memory vector store with cosine similarity
- Hybrid retrieval (vector + keyword boosting)
- Grounded answer generation (no LLM hallucination)

This project implements a **deterministic code reasoning engine** with **anti-hallucination guarantees**.

---

## 🚀 Features

- **AST-aware indexing** — Extracts functions, classes, methods, interfaces from TypeScript files
- **Deterministic embeddings** — Local hashing-based vectors, no external services
- **Hybrid retrieval** — Vector similarity + symbol name keyword boosting
- **Grounded answers** — Returns only retrieved code or "Insufficient context to answer"
- **Human-readable output** — Paragraph summaries + detailed code excerpts with line numbers
- **Debug mode** — Shows retrieved chunks and similarity scores
- **Fully deterministic** — Same query = same results, no randomness

---

## 🧱 Architecture

```
User Query
    ↓
Indexer (AST scan + symbol extraction)
    ↓
Chunks: { symbolName, filePath, source, startLine, endLine }
    ↓
Embeddings (deterministic hashing)
    ↓
InMemoryVectorStore (cosine similarity + keyword boost)
    ↓
Hybrid Retrieval (topK results)
    ↓
Generator (grounded answer from retrieved chunks only)
    ↓
Output: Human-readable summary + code excerpts (or "Insufficient context")
```

---

## 📦 Tech Stack

- Node.js + TypeScript
- TypeScript Compiler API (AST parsing)
- Commander (CLI)
- No external LLM services (deterministic only)

---

## ⚙️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the CLI

Index a directory:
```bash
npm run dev -- index /path/to/src
```

Query the indexed codebase:
```bash
npm run dev -- query explain the whole project
npm run dev -- query where is indexing handled
npm run dev -- query find all functions that parse files
```

### 3. Run Example & Tests

Example script (indexes src/ and runs sample queries with debug output):
```bash
npm run example
```

Integration test:
```bash
npm run test:integration
```

## Project Structure

```
src/
├── cli/
│   ├── index.ts              # Main CLI with index & query commands
│   └── example.ts            # Example usage with debug mode
├── parser/
│   └── astParser.ts          # AST extraction: functions, classes, methods, interfaces
├── indexer/
│   └── indexer.ts            # Indexer class: scans directory & extracts symbols
├── embeddings/
│   └── embeddings.ts         # Deterministic embedding generator
├── retriever/
│   └── vectorStore.ts        # In-memory vector store with hybrid retrieval
├── generator/
│   └── generator.ts          # Grounded answer generator (no hallucination)
├── types/
│   └── index.ts              # Core interfaces: SymbolChunk, EmbeddingRecord, etc.
├── rag/
│   └── answer.ts             # (Legacy, not used in deterministic pipeline)
└── ... (other legacy modules)

tests/
└── integration.test.ts       # Integration test: indexes temp file, queries, asserts

data/
└── chroma/                   # (Legacy, not used)
```

---

## 🛡️ Anti-Hallucination Guarantees

The generator follows **strict rules**:

1. **Only retrieved chunks are used** — No assumptions, no invented facts
2. **Insufficient context returns exact message** — "Insufficient context to answer"
3. **No external library speculation** — Libraries only explained if present in retrieved code
4. **Deterministic embedding** — Same query always produces same results
5. **Hybrid retrieval** — Both vector similarity AND symbol name keyword matching
6. **Human-readable + grounded** — Summaries derived only from code signatures and metadata

---

## 📊 Output Format

Query output includes:

1. **Indexing logs** — Files scanned, symbols extracted per file
2. **Retrieval logs** — Retrieved chunks with similarity scores
3. **Debug info** — Chunk IDs and boost flags
4. **Human-readable summary** — Paragraph of natural-language sentences (one per symbol)
5. **Detailed chunks** — Full code excerpts with file path and line numbers

Example:
```
[cli] querying with deterministic grounded generator...

[indexer] scanning rootDir: /path/to/src
[indexer] files found: 17
[indexer] parser/astParser.ts -> 7 symbol(s) extracted
...

[vectorstore] retrieval results:
  - src/parser/astParser.ts parseFileToSymbols score=0.7152 boosted=true
  - src/retriever/vectorStore.ts InMemoryVectorStore score=0.6774 boosted=true
  ...

========== ANSWER ==========

Answer grounded in 8 retrieved chunk(s):

Function parseFileToSymbols: export function parseFileToSymbols(filePath: string): SymbolChunk[] { (defined in src/parser/astParser.ts lines 21-67). Function InMemoryVectorStore: export class InMemoryVectorStore { (defined in src/retriever/vectorStore.ts lines 19-71). ...

---
Symbol: parseFileToSymbols
File: src/parser/astParser.ts (lines 21-67)

\`\`\`ts
export function parseFileToSymbols(filePath: string): SymbolChunk[] {
  // [full source excerpt]
}
\`\`\`

---
[more chunks...]
```

---

## 🧪 Development

Build:
```bash
npm run build
```

Run dev CLI:
```bash
npm run dev -- query <question>
```

Run example with debug:
```bash
npm run example
```

Run integration test:
```bash
npm run test:integration
```

---

## 🎯 Key Design Principles

- **Deterministic** — No randomness, no LLM involvement
- **Grounded** — Every answer traces back to retrieved code
- **Observable** — Logs show indexing, retrieval, and scoring details
- **Extensible** — Clean module boundaries (parser, indexer, embeddings, retriever, generator)
- **Anti-hallucination** — Explicit "Insufficient context" rather than guessing
```
