import ollama from "ollama";

export async function queryOllama(prompt: string) {
  const response = await ollama.generate({
    model: "deepseek-coder:latest",
    prompt,
    stream: false,
  });

  return response.response;
}
