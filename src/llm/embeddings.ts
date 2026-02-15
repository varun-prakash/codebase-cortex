import ollama from "ollama";

export async function embed(text: string): Promise<number[]> {
  const response = await ollama.embeddings({
    model: "nomic-embed-text:latest",
    prompt: text,
  });

  return response.embedding;
}
