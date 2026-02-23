import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = [".ts", ".js", ".tsx", ".jsx", ".json", ".md"];

export async function getFiles(root: string): Promise<string[]> {
  const files = await glob(`${root}/**/*`, { nodir: true });

  return files.filter((file) =>
    ALLOWED_EXTENSIONS.includes(path.extname(file))
  );
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}
