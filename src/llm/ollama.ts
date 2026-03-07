import axios from "axios";
import ollama from "ollama";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "deepseek-coder:latest"; // or whatever you're using

export async function queryOllama(prompt: string) {
  const response = await ollama.generate({
    model: "deepseek-coder:latest",
    prompt,
    stream: false,
  });

  return response.response;
}

export async function generate(prompt: string): Promise<string> {
  const response = await axios.post(OLLAMA_URL, {
    model: MODEL,
    prompt,
    stream: false,
  });

  return response.data.response;
}
