import { embed } from "../llm/embeddings";
import { getCollection } from "./chroma";

export async function search(query: string, topK = 10) {
  const collection = await getCollection();

  const queryVector = await embed(query);

  const results = await collection.query({
    queryEmbeddings: [queryVector],
    nResults: topK,
  });

  return results as {
    documents?: (string | null)[][];
    metadatas?: any[][];
  };
}
