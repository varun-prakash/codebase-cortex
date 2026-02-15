# Codebase Cortex

A local-first CLI tool for indexing and querying codebases using:

- Ollama (local LLM + embeddings)
- ChromaDB (vector storage)
- TypeScript CLI

This project implements a basic Retrieval-Augmented Generation (RAG) pipeline.

---

## 🚀 Features

- Index a directory of files
- Generate embeddings locally using Ollama
- Store vectors in ChromaDB
- Ask natural language questions about indexed content
- Fully local — no cloud dependencies

---

## 🧱 Architecture

User Question
↓
Embedding (Ollama)
↓
Vector Search (Chroma)
↓
Context Injection
↓
LLM Answer (Ollama)

---

## 📦 Tech Stack

- Node.js + TypeScript
- Ollama
- ChromaDB (local server mode)
- Commander (CLI)

---

## ⚙️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install and run ollama

```bash
ollama pull deepseek-coder
ollama pull nomic-embed-text
```

### 3. Install & run chromaDB

```bash
pip install chromadb
chroma run --path ./data/chroma
```

## Project structure

src/
├── cli/
│ └── index.ts
├── llm/
│ ├── ollama.ts
│ └── embeddings.ts
├── retriever/
│ ├── chroma.ts
│ └── search.ts
└── indexer/
└── index.ts

data/
└── chroma/ (ignored in git)
