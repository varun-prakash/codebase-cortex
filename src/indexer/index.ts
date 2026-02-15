import { getCollection } from "../retriever/chroma";
import { embed } from "../llm/embeddings";
import { randomUUID } from "crypto";

export async function indexText(text: string, metadata = {}) {
  const collection = await getCollection();
  const vector = await embed(text);

  await collection.add({
    ids: [randomUUID()],
    embeddings: [vector],
    documents: [text],
    metadatas: [metadata],
  });
}
