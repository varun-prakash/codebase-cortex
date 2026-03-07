#!/usr/bin/env node

import path from "path";
import { Indexer } from "../indexer/indexer";
import { chunkToEmbeddingRecord } from "../embeddings/embeddings";
import { InMemoryVectorStore } from "../retriever/vectorStore";
import { generateAnswerFromQueryAsync } from "../generator/generator";

async function main() {
  const root = path.resolve(process.cwd(), "src");
  console.log("[example] indexing project at", root);
  const idx = new Indexer({ rootDir: root });
  const chunks = idx.indexAll();

  const store = new InMemoryVectorStore();
  for (const c of chunks) {
    const er = chunkToEmbeddingRecord(c);
    store.add(er);
  }

  // Query 1: Deterministic (grounded only)
  const query1 = "find function that handles indexing or parse files";
  console.log("\n[example] query 1 (deterministic, no LLM):", query1);
  const answer1 = await generateAnswerFromQueryAsync(query1, store, {
    debug: true,
    topK: 5,
    summarize: true,
    summarizeFormat: "paragraph",
  });
  console.log("\n=== ANSWER 1 (Deterministic) ===\n");
  console.log(answer1);

  // Query 2: With mock LLM refinement
  const query2 = "explain the whole project flow";
  console.log("\n\n[example] query 2 (with mock LLM refinement):", query2);
  const answer2 = await generateAnswerFromQueryAsync(query2, store, {
    debug: true,
    topK: 8,
    summarize: true,
    summarizeFormat: "paragraph",
    refine: true,
    useMockLLM: true,
  });
  console.log("\n=== ANSWER 2 (With LLM Refinement) ===\n");
  console.log(answer2);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
