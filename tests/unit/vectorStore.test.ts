import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryVectorStore } from '../../src/retriever/vectorStore'
import { EmbeddingRecord } from '../../src/types'

describe('Vector Store', () => {
  let store: InMemoryVectorStore

  beforeEach(() => {
    store = new InMemoryVectorStore()
  })

  describe('add', () => {
    it('should add records to the store', () => {
      const record: EmbeddingRecord = {
        id: 'test1',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          symbolName: 'foo',
          filePath: '/test.ts',
          startLine: 1,
          endLine: 5,
        },
      }

      store.add(record)

      expect(store['records'].length).toBe(1)
    })

    it('should handle multiple records', () => {
      const records = Array.from({ length: 5 }, (_, i) => ({
        id: `test${i}`,
        embedding: [0.1 * i, 0.2 * i, 0.3 * i],
        metadata: {
          symbolName: `symbol${i}`,
          filePath: '/test.ts',
          startLine: i,
          endLine: i + 5,
        },
      }))

      records.forEach(r => store.add(r))

      expect(store['records'].length).toBe(5)
    })
  })

  describe('retrieve', () => {
    beforeEach(() => {
      const records = [
        {
          id: 'r1',
          embedding: [1, 0, 0],
          metadata: {
            symbolName: 'func1',
            filePath: '/file1.ts',
            startLine: 1,
            endLine: 5,
          },
        },
        {
          id: 'r2',
          embedding: [0.9, 0.1, 0],
          metadata: {
            symbolName: 'func2',
            filePath: '/file2.ts',
            startLine: 10,
            endLine: 15,
          },
        },
        {
          id: 'r3',
          embedding: [0, 1, 0],
          metadata: {
            symbolName: 'func3',
            filePath: '/file3.ts',
            startLine: 20,
            endLine: 25,
          },
        },
      ]

      records.forEach(r => store.add(r))
    })

    it('should retrieve records by vector similarity', () => {
      const queryVec = [1, 0, 0]
      const results = store.retrieve(queryVec, { topK: 2 })

      expect(results.length).toBe(2)
      expect(results[0].record.id).toBe('r1') // Most similar
    })

    it('should respect topK parameter', () => {
      const queryVec = [1, 0, 0]

      const top1 = store.retrieve(queryVec, { topK: 1 })
      const top2 = store.retrieve(queryVec, { topK: 2 })
      const top3 = store.retrieve(queryVec, { topK: 3 })

      expect(top1.length).toBe(1)
      expect(top2.length).toBe(2)
      expect(top3.length).toBe(3)
    })

    it('should include similarity scores', () => {
      const queryVec = [1, 0, 0]
      const results = store.retrieve(queryVec, { topK: 1 })

      expect(results[0].score).toBeDefined()
      expect(typeof results[0].score).toBe('number')
      expect(results[0].score).toBeGreaterThanOrEqual(0)
      expect(results[0].score).toBeLessThanOrEqual(1)
    })

    it('should rank results by descending score', () => {
      const queryVec = [1, 0, 0]
      const results = store.retrieve(queryVec, { topK: 3 })

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('retrieveWithQueryText', () => {
    beforeEach(() => {
      const records = [
        {
          id: 'indexer',
          embedding: [1, 0, 0],
          metadata: {
            symbolName: 'Indexer',
            filePath: '/src/indexer/indexer.ts',
            startLine: 1,
            endLine: 30,
            type: 'class' as const,
          },
        },
        {
          id: 'parser',
          embedding: [0.8, 0.2, 0],
          metadata: {
            symbolName: 'parseFile',
            filePath: '/src/parser/astParser.ts',
            startLine: 40,
            endLine: 60,
            type: 'function' as const,
          },
        },
        {
          id: 'store',
          embedding: [0.3, 0.7, 0],
          metadata: {
            symbolName: 'InMemoryVectorStore',
            filePath: '/src/retriever/vectorStore.ts',
            startLine: 10,
            endLine: 50,
            type: 'class' as const,
          },
        },
      ]

      records.forEach(r => store.add(r))
    })

    it('should boost results with matching symbol names', () => {
      const queryVec = [0.5, 0.5, 0]
      const queryText = 'Indexer'
      const results = store.retrieveWithQueryText(queryText, queryVec, {
        topK: 3,
        keywordBoost: 2.0,
      })

      // Indexer should be boosted even if vector similarity isn't first
      const indexerResult = results.find(r => r.record.metadata.symbolName === 'Indexer')
      expect(indexerResult).toBeDefined()
      expect(indexerResult?.boosted).toBe(true)
    })

    it('should handle missing keyword matches', () => {
      const queryVec = [0.5, 0.5, 0]
      const queryText = 'nonexistent'
      const results = store.retrieveWithQueryText(queryText, queryVec, {
        topK: 3,
        keywordBoost: 2.0,
      })

      expect(results.length).toBeGreaterThan(0)
      const nonBoosted = results.filter(r => !r.boosted)
      expect(nonBoosted.length).toBeGreaterThan(0)
    })

    it('should respect topK limit with keyword boost', () => {
      const queryVec = [0.5, 0.5, 0]
      const queryText = 'Indexer Parser'
      const results = store.retrieveWithQueryText(queryText, queryVec, {
        topK: 2,
        keywordBoost: 2.0,
      })

      expect(results.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Empty store', () => {
    it('should return empty results on empty store', () => {
      const queryVec = [1, 0, 0]
      const results = store.retrieve(queryVec, { topK: 5 })

      expect(results.length).toBe(0)
    })

    it('should handle retrieveWithQueryText on empty store', () => {
      const queryVec = [1, 0, 0]
      const results = store.retrieveWithQueryText('query', queryVec, { topK: 5 })

      expect(results.length).toBe(0)
    })
  })

  describe('Vector normalization', () => {
    it('should calculate cosine similarity correctly', () => {
      const record: EmbeddingRecord = {
        id: 'test',
        embedding: [0.6, 0.8, 0], // unit vector at 45 degrees
        metadata: {
          symbolName: 'test',
          filePath: '/test.ts',
          startLine: 1,
          endLine: 5,
        },
      }

      store.add(record)

      const identicalQuery = [0.6, 0.8, 0]
      const results = store.retrieve(identicalQuery, { topK: 1 })

      // Identical vectors should have similarity ~1.0
      expect(results[0].score).toBeCloseTo(1.0, 1)
    })

    it('should handle orthogonal vectors', () => {
      const record: EmbeddingRecord = {
        id: 'test',
        embedding: [1, 0, 0],
        metadata: {
          symbolName: 'test',
          filePath: '/test.ts',
          startLine: 1,
          endLine: 5,
        },
      }

      store.add(record)

      const orthogonalQuery = [0, 1, 0]
      const results = store.retrieve(orthogonalQuery, { topK: 1 })

      // Orthogonal vectors should have similarity ~0
      expect(results[0].score).toBeCloseTo(0, 1)
    })
  })
})
