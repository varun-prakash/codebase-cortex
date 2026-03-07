#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import { Indexer } from "../indexer/indexer";
import { chunkToEmbeddingRecord } from "../embeddings/embeddings";
import { InMemoryVectorStore } from "../retriever/vectorStore";
import { generateAnswerFromQueryAsync } from "../generator/generator";

const program = new Command();

program
  .name("codebase-cortex")
  .description("Local AI Engineering Copilot")
  .version("0.1.0");

program
  .command("index")
  .argument("<path>")
  .description("Index a directory")
  .action(async (rootDir) => {
    const indexer = new Indexer({ rootDir });
    const chunks = indexer.indexAll();
    console.log(`[cli] indexed ${chunks.length} symbols from ${rootDir}`);
  });

program
  .command("query")
  .argument("<question...>")
  .option("--refine", "Use LLM to refine the grounded answer (requires Ollama)")
  .option("--mock-llm", "Use mock LLM for testing (no external dependency)")
  .description("Ask a question about the codebase")
  .action(async (questionParts: string[], options: any) => {
    const question = questionParts.join(" ");
    console.log("[cli] querying with deterministic grounded generator...\n");

    // Use the deterministic, grounded generator (no LLM hallucination)
    const indexer = new Indexer({ rootDir: path.resolve(process.cwd(), "src") });
    const chunks = indexer.indexAll();

    const store = new InMemoryVectorStore();
    for (const c of chunks) {
      const er = await chunkToEmbeddingRecord(c);
      store.add(er);
    }

    const result = await generateAnswerFromQueryAsync(question, store, {
      debug: false,
      topK: 8,
      summarize: true,
      summarizeFormat: "paragraph",
      minScore: 0.02,
      refine: options.refine ?? false,
      useMockLLM: options.mockLlm ?? false,
    });

    console.log("\n========== ANSWER ==========\n");
    console.log(result);
  });

program.parse();
