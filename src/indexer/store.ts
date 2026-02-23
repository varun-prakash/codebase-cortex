import { embed } from "../llm/embeddings";
import { randomUUID } from "crypto";
import { Collection } from "chromadb";

export async function indexText(
  text: string,
  collection: Collection,
  metadata = {}
) {
  const vector = await embed(text);

  await collection.add({
    ids: [randomUUID()],
    embeddings: [vector],
    documents: [text],
    metadatas: [metadata],
  });
}
