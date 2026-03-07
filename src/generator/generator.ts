import { InMemoryVectorStore } from '../retriever/vectorStore'
import { embedTextDeterministic, chunkToEmbeddingRecord, embedTextOllama } from '../embeddings/embeddings'
import { RetrievalResult } from '../types'
import { AnswerRefiner, RefinerOptions } from './refiner'

export interface GeneratorOptions {
  topK?: number
  keywordBoost?: number
  debug?: boolean
  minScore?: number
  summarize?: boolean
  summarizeFormat?: 'bullets' | 'paragraph'
  refine?: boolean
  useMockLLM?: boolean
}

export function generateAnswerFromQuery(query: string, store: InMemoryVectorStore, opts: GeneratorOptions = {}): Promise<string> {
  return generateAnswerFromQueryAsync(query, store, opts)
}

export async function generateAnswerFromQueryAsync(
  query: string,
  store: InMemoryVectorStore,
  opts: GeneratorOptions = {}
): Promise<string> {
  const debug = opts.debug ?? false
  const topK = opts.topK ?? 5
  const minScore = opts.minScore ?? 0.02

  // Use semantic embeddings from Ollama (with fallback to deterministic)
  const qemb = await embedTextOllama(query)
  const results: RetrievalResult[] = store.retrieveWithQueryText(query, qemb, { topK, keywordBoost: opts.keywordBoost })

  if (debug) {
    console.log('[generator][debug] retrieved chunks:')
    for (const r of results) {
      console.log(` - ${r.record.id} score=${r.score.toFixed(4)} boosted=${r.boosted}`)
    }
  }

  if (!results || results.length === 0 || results[0].score < minScore) {
    return 'Insufficient context to answer'
  }

  // Compose answer strictly from retrieved chunks. No speculation.
  const parts: string[] = []
  parts.push(`Answer grounded in ${results.length} retrieved chunk(s):`)
  // If summarization is requested, create a short human-readable summary
  if (opts.summarize) {
    const format = opts.summarizeFormat ?? 'paragraph'
    if (format === 'bullets') {
      const summaryLines: string[] = []
      summaryLines.push(`Summary: ${results.length} retrieved symbol(s) relevant to the query.`)
      for (const r of results) {
        const m = r.record.metadata
        const src = (m.source || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        let decl = src.length > 0 ? src[0] : ''
        const sigLine = src.find((l) => /^(export\s+)?(function|class|interface|const|let|var)\b/i)
        if (sigLine) decl = sigLine
        // determine a simple type token from declaration
        let typeToken = 'symbol'
        if (/\bclass\b/.test(decl)) typeToken = 'class'
        else if (/\binterface\b/.test(decl)) typeToken = 'interface'
        else if (/\bfunction\b/.test(decl)) typeToken = 'function'
        else if (/\bconst\b|\blet\b|\bvar\b/.test(decl)) typeToken = 'variable'
        summaryLines.push(`- ${m.symbolName} (${typeToken}) in ${m.filePath} lines ${m.startLine}-${m.endLine}: ${decl}`)
      }
      parts.push('\n' + summaryLines.join('\n'))
      parts.push('\n')
    } else {
      // paragraph mode: produce a few short natural-language sentences derived from signatures
      const sentences: string[] = []
      for (const r of results) {
        const m = r.record.metadata
        const src = (m.source || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        // pick signature or first non-empty line
        const sigLine = src.find((l) => /^(export\s+)?(function|class|interface|const|let|var)\b/i)
        const decl = sigLine ?? (src.length > 0 ? src[0] : '')
        // determine a simple type token from declaration
        let typeToken = 'symbol'
        if (/\bclass\b/.test(decl)) typeToken = 'class'
        else if (/\binterface\b/.test(decl)) typeToken = 'interface'
        else if (/\bfunction\b/.test(decl)) typeToken = 'function'
        else if (/\bconst\b|\blet\b|\bvar\b/.test(decl)) typeToken = 'variable'

        // Build a short, factual sentence that rephrases the declaration without adding facts
        let sentence = ''
        if (decl) {
          // If decl already contains the symbol name or signature, use it verbatim but trimmed
          const shortDecl = decl.replace(/\s+/g, ' ').trim()
          sentence = `${capitalize(typeToken)} ${m.symbolName}: ${shortDecl} (defined in ${shortPath(m.filePath)} lines ${m.startLine}-${m.endLine}).`
        } else {
          sentence = `${capitalize(typeToken)} ${m.symbolName} is defined in ${shortPath(m.filePath)} (lines ${m.startLine}-${m.endLine}).`
        }
        sentences.push(sentence)
      }
      parts.push('\n' + sentences.join(' '))
      parts.push('\n')
    }
  }

  function capitalize(s: string) {
    return s && s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s
  }

  function shortPath(p: string) {
    // prefer relative path to cwd when possible
    try {
      const cwd = process.cwd()
      if (p.startsWith(cwd)) return p.slice(cwd.length + 1)
    } catch (_) {}
    return p
  }
  for (const r of results) {
    const m = r.record.metadata
    parts.push(`---\nSymbol: ${m.symbolName}\nFile: ${m.filePath} (lines ${m.startLine}-${m.endLine})\nScore: ${r.score.toFixed(4)} boosted=${r.boosted}\n\n`)
    // include the source verbatim (stored in embedding metadata)
    parts.push('```ts')
    if (m.source) {
      parts.push(m.source)
    } else {
      parts.push(`// source excerpt for ${m.symbolName} (see file ${m.filePath} lines ${m.startLine}-${m.endLine})`)
    }
    parts.push('```')
  }

  const groundedAnswer = parts.join('\n')

  // Optional: refine with LLM if enabled
  if (opts.refine) {
    const refiner = new AnswerRefiner({
      enabled: true,
      useMock: opts.useMockLLM ?? false,
    })
    const refined = await refiner.refine(groundedAnswer, results)
    return refined
  }

  return groundedAnswer
}
