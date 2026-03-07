import { EmbeddingRecord, RetrievalResult, RetrieverConfig } from '../types'

function dot(a: number[], b: number[]) {
  let s = 0
  for (let i = 0; i < a.length && i < b.length; i++) s += a[i] * b[i]
  return s
}

function magnitude(a: number[]) {
  return Math.sqrt(a.reduce((s, v) => s + v * v, 0))
}

function cosine(a: number[], b: number[]) {
  const mag = magnitude(a) * magnitude(b)
  if (mag === 0) return 0
  return dot(a, b) / mag
}

export class InMemoryVectorStore {
  records: EmbeddingRecord[] = []

  add(record: EmbeddingRecord) {
    this.records.push(record)
    console.log('[vectorstore] chunk stored:', record.id, record.metadata.filePath)
  }

  retrieve(queryEmbedding: number[], cfg: RetrieverConfig = {}): RetrievalResult[] {
    const topK = cfg.topK ?? 5
    const keywordBoost = cfg.keywordBoost ?? 1.2
    const scores: RetrievalResult[] = []
    for (const r of this.records) {
      const base = cosine(queryEmbedding, r.embedding)
      // simple keyword boost: if query words appear in symbol name, boost
      let boosted = false
      const score = base
      scores.push({ record: r, score, boosted })
    }
    // sort descending
    scores.sort((a, b) => b.score - a.score)
    return scores.slice(0, topK)
  }

  retrieveWithQueryText(queryText: string, queryEmbedding: number[], cfg: RetrieverConfig = {}): RetrievalResult[] {
    const topK = cfg.topK ?? 5
    const keywordBoost = cfg.keywordBoost ?? 1.25
    const qtokens = queryText
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)

    const scores: RetrievalResult[] = []
    for (const r of this.records) {
      let base = cosine(queryEmbedding, r.embedding)
      let boosted = false
      for (const t of qtokens) {
        if (r.metadata.symbolName.toLowerCase().includes(t)) {
          base = base * keywordBoost
          boosted = true
        }
      }
      scores.push({ record: r, score: base, boosted })
    }
    scores.sort((a, b) => b.score - a.score)
    // logging retrieved file paths and scores for observability
    console.log('[vectorstore] retrieval results:')
    for (const s of scores.slice(0, topK)) {
      console.log(`  - ${s.record.metadata.filePath} ${s.record.metadata.symbolName} score=${s.score.toFixed(4)} boosted=${s.boosted}`)
    }
    return scores.slice(0, topK)
  }
}
