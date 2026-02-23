#!/usr/bin/env node

import { Command } from "commander";
import { queryOllama } from "../llm/ollama";
import { indexDirectory } from "../indexer";
import { recreateCollection } from "../retriever/chroma";

const collection = recreateCollection();

const program = new Command();

program
  .name("codebase-cortex")
  .description("Local AI Engineering Copilot")
  .version("0.1.0");

program
  .command("index")
  .argument("<path>")
  .action(async (path) => {
    await indexDirectory("./src", await collection);
  });

program
  .command("ask")
  .argument("<question>", "Question about codebase")
  .action(async (question) => {
    console.log("Thinking...\n");
    const result = await queryOllama(question);
    console.log(result);
  });

program.parse();
