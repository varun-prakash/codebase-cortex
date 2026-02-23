import { getFiles, readFile } from "./files";
import { chunkText } from "./chunk";
import { indexText } from "./store";
import { Collection } from "chromadb";

export async function indexDirectory(root: string, collection: Collection) {
  const files = await getFiles(root);

  console.log(`Found ${files.length} files`);

  for (const file of files) {
    const content = await readFile(file);
    const chunks = chunkText(content);

    console.log(`Indexing ${file} (${chunks.length} chunks)`);

    for (let i = 0; i < chunks.length; i++) {
      await indexText(chunks[i], collection, {
        path: file,
        chunk: i,
      });
    }
  }

  console.log("Indexing complete");
}
