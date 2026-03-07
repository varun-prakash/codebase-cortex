import { describe, it, expect } from 'vitest'
import { embedTextDeterministic } from '../../src/embeddings/embeddings'
import { SymbolChunk } from '../../src/types'

describe('Embeddings', () => {
  describe('embedTextDeterministic (fallback)', () => {
    it('should produce consistent vectors for the same input', () => {
      const text = 'export function greet(name: string) { return `Hello ${name}` }'
      const vec1 = embedTextDeterministic(text)
      const vec2 = embedTextDeterministic(text)
      
      expect(vec1).toEqual(vec2)
    })

    it('should produce normalized vectors with magnitude ~1', () => {
      const text = 'test code snippet'
      const vec = embedTextDeterministic(text)
      
      const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
      expect(magnitude).toBeCloseTo(1.0, 2)
    })

    it('should produce 384-dimensional vectors by default', () => {
      const text = 'const x = 42'
      const vec = embedTextDeterministic(text)
      
      expect(vec.length).toBe(384)
    })

    it('should produce different vectors for different inputs', () => {
      const vec1 = embedTextDeterministic('function foo() {}')
      const vec2 = embedTextDeterministic('function bar() {}')
      
      expect(vec1).not.toEqual(vec2)
    })

    it('should handle empty strings', () => {
      const vec = embedTextDeterministic('')
      
      expect(vec.length).toBe(384)
      expect(vec.every(v => v === 0)).toBe(true)
    })

    it('should handle long texts', () => {
      const longText = 'x'.repeat(10000)
      const vec = embedTextDeterministic(longText)
      
      expect(vec.length).toBe(384)
      expect(vec.some(v => v !== 0)).toBe(true)
    })

    it('should support custom dimensions', () => {
      const text = 'test'
      const vec128 = embedTextDeterministic(text, 128)
      const vec256 = embedTextDeterministic(text, 256)
      
      expect(vec128.length).toBe(128)
      expect(vec256.length).toBe(256)
    })

    it('should be deterministic across multiple runs', () => {
      const text = 'deterministic test'
      const vectors = Array.from({ length: 5 }, () => embedTextDeterministic(text))
      
      for (let i = 1; i < vectors.length; i++) {
        expect(vectors[i]).toEqual(vectors[0])
      }
    })
  })

  describe('Chunk to Embedding Record conversion', () => {
    it('should include all chunk metadata', async () => {
      const { chunkToEmbeddingRecord } = await import('../../src/embeddings/embeddings')
      
      const chunk: SymbolChunk = {
        id: 'test:foo:1',
        symbolName: 'foo',
        filePath: '/test/file.ts',
        source: 'function foo() {}',
        startLine: 1,
        endLine: 1,
        type: 'function',
      }
      
      const record = await chunkToEmbeddingRecord(chunk)
      
      expect(record.metadata.symbolName).toBe('foo')
      expect(record.metadata.filePath).toBe('/test/file.ts')
      expect(record.metadata.source).toBe('function foo() {}')
      expect(record.metadata.startLine).toBe(1)
      expect(record.metadata.endLine).toBe(1)
      expect(record.metadata.type).toBe('function')
    })

    it('should produce an embedding vector', async () => {
      const { chunkToEmbeddingRecord } = await import('../../src/embeddings/embeddings')
      
      const chunk: SymbolChunk = {
        id: 'test:bar:10',
        symbolName: 'bar',
        filePath: '/test/file.ts',
        source: 'const bar = 42',
        startLine: 10,
        endLine: 10,
        type: undefined,
      }
      
      const record = await chunkToEmbeddingRecord(chunk)
      
      expect(record.embedding).toBeDefined()
      expect(Array.isArray(record.embedding)).toBe(true)
      expect(record.embedding.length).toBeGreaterThan(0)
    })

    it('should preserve parent relationship', async () => {
      const { chunkToEmbeddingRecord } = await import('../../src/embeddings/embeddings')
      
      const chunk: SymbolChunk = {
        id: 'test:method:1',
        symbolName: 'doSomething',
        filePath: '/test/class.ts',
        source: 'doSomething() {}',
        startLine: 5,
        endLine: 7,
        parent: 'MyClass',
        type: 'method',
      }
      
      const record = await chunkToEmbeddingRecord(chunk)
      
      expect(record.metadata.parent).toBe('MyClass')
    })
  })
})
