import { getCollection } from "./chroma";
import { embed } from "../llm/embeddings";

export async function search(query: string) {
  const collection = await getCollection();
  const vector = await embed(query);

  const result = await collection.query({
    queryEmbeddings: [vector],
    nResults: 3,
  });

  return result.documents;
}
