import { SymbolChunk, EmbeddingRecord } from '../types'

// Deterministic, local "embedding" generator. Produces a fixed-length vector from text.
export function embedTextDeterministic(text: string, dim = 128): number[] {
  // simple deterministic hashing-based vector. Not suitable for production embeddings,
  // but meets the "local and deterministic" constraint for this task.
  const out = new Array<number>(dim).fill(0)
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    const idx = i % dim
    out[idx] = (out[idx] + (ch * (i + 1)) % 1000) / 1000
  }
  // normalize
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0)) || 1
  return out.map((v) => v / norm)
}

export function chunkToEmbeddingRecord(chunk: SymbolChunk): EmbeddingRecord {
  const embedding = embedTextDeterministic(chunk.source)
  return {
    id: chunk.id,
    embedding,
    metadata: {
      symbolName: chunk.symbolName,
      filePath: chunk.filePath,
      source: chunk.source,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      parent: chunk.parent ?? null,
    },
  }
}
