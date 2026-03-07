import axios from "axios";

export interface LLMProvider {
  refine(groundedAnswer: string, context: string): Promise<string>;
  isAvailable(): Promise<boolean>;
}

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "deepseek-coder:latest";

export class OllamaProvider implements LLMProvider {
  async refine(groundedAnswer: string, context: string): Promise<string> {
    const prompt = `You are a technical documentation writer. Your task is to refine and expand the following grounded answer into a natural, narrative explanation. Use the provided code context to support your explanation with inline citations.

IMPORTANT RULES:
- Keep all facts from the grounded answer (do not invent new information)
- Use the code context provided to explain implementation details
- Add inline citations like [file.ts:line] for code references
- Do NOT speculate about functionality not visible in the provided code
- Make the narrative flow naturally while staying grounded in the code
- Output should be 2-4 paragraphs, not a bullet list

Grounded Answer:
${groundedAnswer}

Code Context (for reference):
${context}

Now provide a refined, narrative explanation with citations:`;

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
