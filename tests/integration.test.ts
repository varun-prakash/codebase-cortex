import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { Indexer } from '../src/indexer/indexer'
import { chunkToEmbeddingRecord } from '../src/embeddings/embeddings'
import { InMemoryVectorStore } from '../src/retriever/vectorStore'
import { generateAnswerFromQueryAsync } from '../src/generator/generator'

async function runIntegration() {
  const tmpDir = path.join(process.cwd(), 'tests', 'tmp_project')
  fs.mkdirSync(tmpDir, { recursive: true })
  const filePath = path.join(tmpDir, 'sample.ts')
  const content = `export function greet(name: string) {\n  return ` + "`Hello ${name}`" + `\n}`
  fs.writeFileSync(filePath, content, 'utf8')

  const idx = new Indexer({ rootDir: tmpDir })
  const chunks = idx.indexAll()
  assert(chunks.length >= 1, 'expected at least one chunk extracted')

  const store = new InMemoryVectorStore()
  for (const c of chunks) {
    const er = await chunkToEmbeddingRecord(c)
    store.add(er)
  }

  const answer = await generateAnswerFromQueryAsync('greet function', store, { debug: true })
  console.log('integration answer:\n', answer)
  assert(answer !== 'Insufficient context to answer', 'expected the engine to find context for greet')

  // cleanup
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch (_) {}
}

if (require.main === module) {
  runIntegration()
    .then(() => console.log('integration test passed'))
    .catch((e) => {
      console.error('integration test failed', e)
      process.exit(1)
    })
}
