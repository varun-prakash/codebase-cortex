import { EmbeddingRecord, RetrievalResult } from "../types";
import { LLMProvider, OllamaProvider, MockLLMProvider } from "../llm/llmProvider";

export interface RefinerOptions {
  enabled?: boolean;
  useMock?: boolean;
  minScore?: number;
}

export class AnswerRefiner {
  private llmProvider: LLMProvider;
  private enabled: boolean;

  constructor(opts: RefinerOptions = {}) {
    this.enabled = opts.enabled ?? false;
    this.llmProvider = opts.useMock ? new MockLLMProvider() : new OllamaProvider();
  }

  /**
   * Optionally refine a grounded answer using an LLM.
   * If refinement is disabled or LLM is unavailable, returns the grounded answer.
   * The LLM is only used for prose enhancement; facts must come from retrieved chunks.
   */
  async refine(
    groundedAnswer: string,
    retrievedResults: RetrievalResult[]
  ): Promise<string> {
    if (!this.enabled) {
      return groundedAnswer;
    }

    const isAvailable = await this.llmProvider.isAvailable();
    if (!isAvailable) {
      console.log(
        "[refiner] LLM provider not available, returning grounded answer"
      );
      return groundedAnswer;
    }

    // Build context from retrieved chunks for the LLM to reference
    const context = this.buildContextForLLM(retrievedResults);

    console.log("[refiner] refining answer with LLM...");
    try {
      const refined = await this.llmProvider.refine(groundedAnswer, context);
      return refined;
    } catch (err) {
      console.error("[refiner] refinement error, returning grounded answer", err);
      return groundedAnswer;
    }
  }

  private buildContextForLLM(results: RetrievalResult[]): string {
    const lines: string[] = [];
    lines.push("Retrieved Code Chunks:");
    lines.push("=".repeat(50));

    for (const r of results) {
      const m = r.record.metadata;
      lines.push(`\n[${m.filePath}:${m.startLine}-${m.endLine}]`);
      lines.push(`Symbol: ${m.symbolName}`);
      if (m.source) {
        lines.push("```ts");
        lines.push(m.source);
        lines.push("```");
      }
    }

    return lines.join("\n");
  }
}
