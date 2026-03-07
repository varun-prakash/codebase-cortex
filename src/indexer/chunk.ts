import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

export interface CodeChunk {
  content: string;
  symbol?: string;
  type: "function" | "class" | "module";
}

export function chunkCode(fileContent: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  try {
    const ast = parse(fileContent, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    traverse(ast, {
      ExportNamedDeclaration(path) {
        const node = path.node.declaration;

        if (t.isFunctionDeclaration(node) && node.id) {
          chunks.push({
            content: fileContent.slice(node.start!, node.end!),
            symbol: node.id.name,
            type: "function",
          });
        }

        if (t.isClassDeclaration(node) && node.id) {
          chunks.push({
            content: fileContent.slice(node.start!, node.end!),
            symbol: node.id.name,
            type: "class",
          });
        }
      },
    });
  } catch (err) {
    // fallback if parsing fails
  }

  // Fallback: no exports found → whole file
  if (chunks.length === 0) {
    chunks.push({
      content: fileContent,
      type: "module",
    });
  }

  return chunks;
}
