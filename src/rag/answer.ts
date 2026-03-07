import { search } from "../retriever/search";
import { generate } from "../llm/ollama";

export async function answerQuestion(question: string) {
  const results = await search(question, 8);

  const documents = results.documents?.[0] ?? [];
  const metadatas = results.metadatas?.[0] ?? [];

  const context = documents
    .map((doc, i) => {
      const meta = metadatas[i];
      return `File: ${meta?.path}\n\n${doc}`;
    })
    .join("\n\n---\n\n");

  const prompt = `
You are analyzing a TypeScript codebase.

STRICT INSTRUCTIONS:
- Use ONLY the provided context.
- Do NOT invent line numbers.
- Do NOT describe libraries unless explicitly shown.
- Extract execution flow exactly as written.

First output a structured trace in JSON:

{
  "entry_function": "",
  "calls": [
    {
      "function": "",
      "file": ""
    }
  ]
}

Then provide a concise explanation.

Context:
${context}

Question:
${question}
`;

  const response = await generate(prompt);

  return response;
}
