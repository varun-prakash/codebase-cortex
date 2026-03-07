import path from 'path'
import { Indexer } from '../indexer/indexer'
import { chunkToEmbeddingRecord } from '../embeddings/embeddings'
import { InMemoryVectorStore } from '../retriever/vectorStore'
import { generateAnswerFromQueryAsync } from '../generator/generator'

async function main() {
  const root = path.resolve(process.cwd(), 'src')
  console.log('[example] indexing project at', root)
  const idx = new Indexer({ rootDir: root })
  const chunks = idx.indexAll()

  const store = new InMemoryVectorStore()
  for (const c of chunks) {
    const er = await chunkToEmbeddingRecord(c)
    store.add(er)
  }

  const query = 'find function that handles indexing or parse files'
  console.log('\n[example] running query (debug mode):', query)
  const answer = await generateAnswerFromQueryAsync(query, store, { debug: true, topK: 5 })
  console.log('\n=== ANSWER ===\n')
  console.log(answer)

  // second example query: ask for an explanation of the whole project flow
  const query2 = 'explain the whole project flow'
  console.log('\n[example] running second query (debug mode):', query2)
  const answer2 = await generateAnswerFromQueryAsync(query2, store, { debug: true, topK: 8, summarize: true, summarizeFormat: 'paragraph' })
  console.log('\n=== ANSWER (project flow) ===\n')
  console.log(answer2)
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
