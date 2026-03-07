import axios from "axios";

export interface LLMProvider {
  refine(groundedAnswer: string, context: string): Promise<string>;
  isAvailable(): Promise<boolean>;
}

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "deepseek-coder:latest";

export class OllamaProvider implements LLMProvider {
  async refine(groundedAnswer: string, context: string): Promise<string> {
    const prompt = `You are a code documentation expert. Your ONLY task is to improve the readability and flow of the provided grounded answer using the code context. You are NOT allowed to add new facts or speculate.

STRICT RULES (MUST FOLLOW):
1. Every claim must be directly supported by the code context provided below
2. Add inline citations like [file.ts:lines] for ALL code references
3. If the answer says something is in the context, verify it exists in the provided code
4. Do NOT add features, behaviors, or details not visible in the code
5. Do NOT explain 'why' something was designed a certain way unless the code contains comments explaining it
6. If you cannot verify a claim in the provided code, remove or rephrase it to be factually accurate
7. Output ONLY the refined answer with citations - do NOT add meta-commentary or explanations

FACT-CHECKING INSTRUCTIONS:
- Before including any claim, check if it appears in the code context
- Use exact line numbers from the code context when citing
- If a function/class name doesn't appear in code, don't mention it
- If you're unsure, default to the original grounded answer

CITATION FORMAT:
Use [filename:line-range] format, e.g., [indexer.ts:15-20] or [parser.ts:42]

Grounded Answer (to improve):
${groundedAnswer}

Code Context (source of truth):
${context}

Now provide the refined answer with proper citations. Only rewrite for clarity and flow - do NOT add new information:`;

    try {
      const response = await axios.post(OLLAMA_URL, {
        model: MODEL,
        prompt,
        stream: false,
      });
      return response.data.response;
    } catch (err) {
      console.error("[llm] Ollama refinement failed, returning grounded answer");
      return groundedAnswer;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get("http://localhost:11434/api/tags", {
        timeout: 2000,
      });
      return response.status === 200;
    } catch (_) {
      return false;
    }
  }
}

// Mock provider for testing (no external dependency)
export class MockLLMProvider implements LLMProvider {
  async refine(groundedAnswer: string, _context: string): Promise<string> {
    // Return the grounded answer with a note that it's mocked
    return `[Refined with mock LLM]\n\n${groundedAnswer}`;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
