import { getFiles, readFile } from "./files";
import { chunkCode } from "./chunk";
import { indexText } from "./store";
import { Collection } from "chromadb";

export async function indexDirectory(root: string, collection: Collection) {
  const files = await getFiles(root);

  console.log(`Found ${files.length} files`);

  for (const file of files) {
    const content = await readFile(file);
    const chunks = chunkCode(content);
    // const chunks = [content]; // No chunking for now, to preserve context

    console.log(`Indexing ${file} (${chunks.length} chunks)`);

    for (const chunk of chunks) {
      await indexText(chunk.content, collection, {
        path: file,
        symbol: chunk.symbol,
        type: chunk.type,
      });
    }
  }

  console.log("Indexing complete");
}
