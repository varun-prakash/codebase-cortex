import path from 'path'
import { scanDirectoryForFiles, parseFileToSymbols } from '../parser/astParser'
import { SymbolChunk, IndexerConfig } from '../types'

export class Indexer {
  rootDir: string
  extensions: string[]
  constructor(cfg: IndexerConfig) {
    this.rootDir = cfg.rootDir
    this.extensions = cfg.extensions ?? ['.ts', '.js']
  }

  indexAll(): SymbolChunk[] {
    console.log('[indexer] scanning rootDir:', this.rootDir)
    const files = scanDirectoryForFiles(this.rootDir, this.extensions)
    console.log(`[indexer] files found: ${files.length}`)
    const allChunks: SymbolChunk[] = []
    for (const f of files) {
      try {
        const chunks = parseFileToSymbols(f)
        console.log(`[indexer] ${path.relative(this.rootDir, f)} -> ${chunks.length} symbol(s) extracted`)
        allChunks.push(...chunks)
      } catch (err) {
        console.error('[indexer] failed to parse', f, err)
      }
    }
    console.log('[indexer] total chunks:', allChunks.length)
    return allChunks
  }
}
