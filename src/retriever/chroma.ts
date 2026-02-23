import { ChromaClient, Collection } from "chromadb";

export const chroma = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false,
});

const COLLECTION_NAME = "codebase";

export async function recreateCollection(): Promise<Collection> {
  // Delete if exists
  try {
    await chroma.deleteCollection({ name: COLLECTION_NAME });
    console.log("Old collection deleted");
  } catch {
    // ignore if it doesn't exist
  }

  // Create fresh collection WITHOUT embedding function
  const collection = await chroma.createCollection({
    name: COLLECTION_NAME,
    embeddingFunction: null,
  });

  console.log("New collection created");

  return collection;
}

export async function getCollection(): Promise<Collection> {
  return chroma.getCollection({ name: COLLECTION_NAME });
}
