export interface SymbolChunk {
  id: string
  symbolName: string
  filePath: string
  source: string
  startLine: number
  endLine: number
  parent?: string | null
}

export interface EmbeddingRecord {
  id: string
  embedding: number[]
  metadata: {
    symbolName: string
    filePath: string
    source?: string
    startLine: number
    endLine: number
    parent?: string | null
  }
}

export interface RetrievalResult {
  record: EmbeddingRecord
  score: number
  boosted: boolean
}

export interface IndexerConfig {
  rootDir: string
  extensions?: string[]
}

export interface RetrieverConfig {
  topK?: number
  keywordBoost?: number
}
