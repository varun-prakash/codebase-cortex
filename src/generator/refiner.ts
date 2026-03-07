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
   * 
   * Anti-hallucination guardrails:
   * - LLM receives ONLY the grounded answer + actual code context
   * - Prompt includes strict fact-checking instructions
   * - Falls back to grounded answer if LLM unavailable or errors
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

    console.log("[refiner] refining answer with LLM (with strict fact-checking guardrails)...");
    try {
      const refined = await this.llmProvider.refine(groundedAnswer, context);
      
      // Post-refinement validation: ensure refined answer still contains code references
      const hasCodeRefs = /\[.*?:\d+/.test(refined);
      if (!hasCodeRefs && retrievedResults.length > 0) {
        console.warn("[refiner] refined answer missing code citations, falling back to grounded");
        return groundedAnswer;
      }
      
      return refined;
    } catch (err) {
      console.error("[refiner] refinement error, returning grounded answer", err);
      return groundedAnswer;
    }
  }

  private buildContextForLLM(results: RetrievalResult[]): string {
    const lines: string[] = [];
    lines.push("RETRIEVED CODE CHUNKS (source of truth):");
    lines.push("=".repeat(60));

    for (const r of results) {
      const m = r.record.metadata;
      const typeInfo = m.type ? ` [${m.type.toUpperCase()}]` : '';
      const parentInfo = m.parent ? ` (member of ${m.parent})` : '';
      
      lines.push(`\nFile: ${m.filePath}`);
      lines.push(`Lines: ${m.startLine}-${m.endLine}`);
      lines.push(`Symbol: ${m.symbolName}${typeInfo}${parentInfo}`);
      lines.push(`Relevance Score: ${r.score.toFixed(4)}`);
      
      if (m.source) {
        lines.push("Code:");
        lines.push("```ts");
        lines.push(m.source);
        lines.push("```");
      }
    }

    lines.push("\n" + "=".repeat(60));
    lines.push("INSTRUCTION: Base your refinement ONLY on the code chunks above.");
    lines.push("Do not add information not present in the code context.");

    return lines.join("\n");
  }
}
