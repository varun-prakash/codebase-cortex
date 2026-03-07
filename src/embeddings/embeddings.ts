import axios from 'axios'
import { SymbolChunk, EmbeddingRecord } from '../types'

const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embed'
const EMBED_MODEL = 'nomic-embed-text'

/**
 * Get semantic embeddings from Ollama.
 * Falls back to deterministic embeddings if Ollama is unavailable.
 */
export async function embedTextOllama(text: string): Promise<number[]> {
  try {
    const response = await axios.post(OLLAMA_EMBED_URL, {
      model: EMBED_MODEL,
      input: text,
    }, { timeout: 10000 })
    
    if (response.data?.embeddings?.[0]) {
      return response.data.embeddings[0]
    }
    console.warn('[embeddings] Ollama response missing embeddings, falling back to deterministic')
    return embedTextDeterministic(text)
  } catch (err) {
    console.warn('[embeddings] Ollama unavailable, falling back to deterministic embeddings')
    return embedTextDeterministic(text)
  }
}

/**
 * Fallback: deterministic, local "embedding" generator. Produces a fixed-length vector from text.
 * Used when Ollama is unavailable.
 */
export function embedTextDeterministic(text: string, dim = 384): number[] {
  // Deterministic hashing-based vector. Fallback only.
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

export async function chunkToEmbeddingRecord(chunk: SymbolChunk): Promise<EmbeddingRecord> {
  const embedding = await embedTextOllama(chunk.source)
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
      type: chunk.type,
    },
  }
}
