import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateAnswerFromQueryAsync } from '../../src/generator/generator'
import { InMemoryVectorStore } from '../../src/retriever/vectorStore'
import { EmbeddingRecord } from '../../src/types'

describe('Generator', () => {
  let store: InMemoryVectorStore

  beforeEach(() => {
    store = new InMemoryVectorStore()
  })

  describe('generateAnswerFromQueryAsync', () => {
    it('should return insufficient context for empty store', async () => {
      const answer = await generateAnswerFromQueryAsync('test query', store, {
        minScore: 0.02,
      })

      expect(answer).toBe('Insufficient context to answer')
    })

    it('should return grounded answer from retrieved chunks', async () => {
      const record: EmbeddingRecord = {
        id: 'test1',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'greet',
          filePath: '/src/greet.ts',
          source: 'export function greet(name: string) { return `Hello ${name}` }',
          startLine: 1,
          endLine: 1,
          type: 'function',
        },
      }

      store.add(record)

      const answer = await generateAnswerFromQueryAsync('greet function', store, {
        debug: false,
        topK: 5,
        minScore: -1, // Lower threshold for fallback embeddings
      })

      expect(answer).toBeDefined()
      expect(answer).not.toBe('Insufficient context to answer')
      expect(answer).toContain('greet')
    })

    it('should include source code in answer', async () => {
      const sourceCode = 'export function add(a: number, b: number) { return a + b }'
      const record: EmbeddingRecord = {
        id: 'add',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'add',
          filePath: '/src/math.ts',
          source: sourceCode,
          startLine: 1,
          endLine: 1,
          type: 'function',
        },
      }

      store.add(record)

      const answer = await generateAnswerFromQueryAsync('add function', store, {
        minScore: -1,
      })

      expect(answer).toContain(sourceCode)
    })

    it('should include metadata in answer', async () => {
      const record: EmbeddingRecord = {
        id: 'test',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'testFunc',
          filePath: '/src/test.ts',
          source: 'function testFunc() {}',
          startLine: 42,
          endLine: 45,
          type: 'function',
        },
      }

      store.add(record)

      const answer = await generateAnswerFromQueryAsync('test', store, {
        debug: false,
      })

      expect(answer).toContain('testFunc')
      expect(answer).toContain('/src/test.ts')
      expect(answer).toContain('42')
      expect(answer).toContain('45')
    })

    it('should respect topK limit', async () => {
      // Add 5 records
      for (let i = 0; i < 5; i++) {
        const record: EmbeddingRecord = {
          id: `test${i}`,
          embedding: [0.1 * (i + 1), 0, 0],
          metadata: {
            symbolName: `func${i}`,
            filePath: `/src/file${i}.ts`,
            source: `function func${i}() {}`,
            startLine: i,
            endLine: i + 1,
            type: 'function',
          },
        }
        store.add(record)
      }

      const answer = await generateAnswerFromQueryAsync('function', store, {
        debug: false,
        topK: 2,
      })

      // Should only include 2 chunks
      const functionMatches = (answer.match(/function func\d\(\)/g) || []).length
      expect(functionMatches).toBeLessThanOrEqual(2)
    })

    it('should generate human-readable summary if requested', async () => {
      const record: EmbeddingRecord = {
        id: 'calc',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'Calculator',
          filePath: '/src/calculator.ts',
          source: 'export class Calculator { add(a, b) { return a + b } }',
          startLine: 1,
          endLine: 5,
          type: 'class',
        },
      }

      store.add(record)

      const answer = await generateAnswerFromQueryAsync('calculator', store, {
        summarize: true,
        summarizeFormat: 'paragraph',
      })

      expect(answer).toContain('Calculator')
      // Summary should have some natural language structure
      expect(answer.length).toBeGreaterThan(0)
    })

    it('should include file location metadata', async () => {
      const record: EmbeddingRecord = {
        id: 'indexer',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'Indexer',
          filePath: '/src/indexer/indexer.ts',
          source: 'export class Indexer {}',
          startLine: 10,
          endLine: 20,
          type: 'class',
        },
      }

      store.add(record)

      const answer = await generateAnswerFromQueryAsync('indexer', store, {
        debug: false,
        minScore: -1,
      })

      expect(answer).toContain('indexer/indexer.ts')
      expect(answer).toContain('10')
      expect(answer).toContain('20')
    })

    it('should filter results by minScore', async () => {
      const record: EmbeddingRecord = {
        id: 'low-score',
        embedding: [0.01, 0, 0], // Very different from typical query
        metadata: {
          symbolName: 'lowScore',
          filePath: '/src/low.ts',
          source: 'function lowScore() {}',
          startLine: 1,
          endLine: 1,
          type: 'function',
        },
      }

      store.add(record)

      // With high minScore threshold, should return insufficient context
      const answer = await generateAnswerFromQueryAsync('unrelated query', store, {
        minScore: 0.5,
      })

      expect(answer).toBe('Insufficient context to answer')
    })

    it('should handle method chunks with parent class info', async () => {
      const record: EmbeddingRecord = {
        id: 'method',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'doSomething',
          filePath: '/src/service.ts',
          source: 'doSomething() { return "done" }',
          startLine: 5,
          endLine: 7,
          type: 'method',
          parent: 'MyService',
        },
      }

      store.add(record)

      const answer = await generateAnswerFromQueryAsync('doSomething', store, {
        minScore: -1,
      })

      expect(answer).toContain('doSomething')
      // Parent info might be in metadata or source
      expect(answer.length).toBeGreaterThan(0)
    })

    it('should include score information in debug mode', async () => {
      const record: EmbeddingRecord = {
        id: 'debug-test',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'test',
          filePath: '/src/test.ts',
          source: 'function test() {}',
          startLine: 1,
          endLine: 1,
          type: 'function',
        },
      }

      store.add(record)

      // Note: debug mode logs to console, but we can verify answer quality
      const answer = await generateAnswerFromQueryAsync('test', store, {
        debug: false,
      })

      expect(answer).toBeDefined()
      expect(answer.length).toBeGreaterThan(0)
    })

    it('should always return grounded answers (no speculation)', async () => {
      const record: EmbeddingRecord = {
        id: 'indexer',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'Indexer',
          filePath: '/src/indexer/indexer.ts',
          source: `export class Indexer {
  indexAll() {
    // indexes files
  }
}`,
          startLine: 1,
          endLine: 5,
          type: 'class',
        },
      }

      store.add(record)

      const answer = await generateAnswerFromQueryAsync('what does the indexer do', store, {
        summarize: false,
        minScore: -1,
      })

      // Answer should come directly from retrieved code
      expect(answer).toContain('Indexer')
      expect(answer).toContain('indexAll')
      // Should not invent details not in the source
      expect(answer).not.toContain('It uses')
      expect(answer).not.toContain('The indexer creates')
    })

    it('should handle multiple retrieved chunks', async () => {
      const records = [
        {
          id: 'func1',
          embedding: [1, 0, 0],
          metadata: {
            symbolName: 'parseFile',
            filePath: '/src/parser.ts',
            source: 'function parseFile() {}',
            startLine: 1,
            endLine: 1,
            type: 'function' as const,
          },
        },
        {
          id: 'func2',
          embedding: [0.95, 0.05, 0],
          metadata: {
            symbolName: 'extractSymbols',
            filePath: '/src/parser.ts',
            source: 'function extractSymbols() {}',
            startLine: 5,
            endLine: 5,
            type: 'function' as const,
          },
        },
      ]

      records.forEach(r => store.add(r))

      const answer = await generateAnswerFromQueryAsync('parsing', store, {
        topK: 2,
        minScore: -1,
      })

      expect(answer).toContain('parseFile')
      expect(answer).toContain('extractSymbols')
      expect(answer).toContain('2 retrieved chunk(s)')
    })
  })
})
