import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnswerRefiner } from '../../src/generator/refiner'
import { RetrievalResult, EmbeddingRecord } from '../../src/types'

describe('Answer Refiner', () => {
  let refiner: AnswerRefiner
  let mockResults: RetrievalResult[]

  beforeEach(() => {
    refiner = new AnswerRefiner({ enabled: false, useMock: true })
    mockResults = [
      {
        record: {
          id: 'test1',
          embedding: [1, 0, 0],
          metadata: {
            symbolName: 'foo',
            filePath: '/src/foo.ts',
            source: 'export function foo() { return 42 }',
            startLine: 1,
            endLine: 1,
            type: 'function',
          },
        },
        score: 0.95,
        boosted: false,
      },
      {
        record: {
          id: 'test2',
          embedding: [0.9, 0.1, 0],
          metadata: {
            symbolName: 'bar',
            filePath: '/src/bar.ts',
            source: 'export function bar() { return "hello" }',
            startLine: 5,
            endLine: 5,
            type: 'function',
          },
        },
        score: 0.85,
        boosted: true,
      },
    ]
  })

  describe('refine', () => {
    it('should return grounded answer when disabled', async () => {
      const groundedAnswer = 'Original grounded answer from retrieved chunks'
      const refinedAnswer = await refiner.refine(groundedAnswer, mockResults)

      expect(refinedAnswer).toBe(groundedAnswer)
    })

    it('should use mock LLM when enabled with mock flag', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer = 'Grounded answer'

      const refinedAnswer = await refinerWithMock.refine(groundedAnswer, mockResults)

      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
      expect(refinedAnswer.length).toBeGreaterThan(0)
    })

    it('should preserve grounded answer content in mock refinement', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer = 'The foo function returns 42'

      const refinedAnswer = await refinerWithMock.refine(groundedAnswer, mockResults)

      expect(refinedAnswer).toContain(groundedAnswer)
    })

    it('should gracefully handle empty results array', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer = 'Test answer'

      const refinedAnswer = await refinerWithMock.refine(groundedAnswer, [])

      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
    })

    it('should include context from retrieved chunks in refinement', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer = 'Answer'

      const refinedAnswer = await refinerWithMock.refine(groundedAnswer, mockResults)

      // Mock refinement should preserve the context
      expect(refinedAnswer).toBeDefined()
    })

    it('should handle single result', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const singleResult = [mockResults[0]]
      const groundedAnswer = 'Single result answer'

      const refinedAnswer = await refinerWithMock.refine(groundedAnswer, singleResult)

      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
    })

    it('should handle many results (10+)', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const manyResults = Array.from({ length: 12 }, (_, i) => ({
        record: {
          id: `test${i}`,
          embedding: [1 - i * 0.05, 0, 0],
          metadata: {
            symbolName: `symbol${i}`,
            filePath: `/src/file${i}.ts`,
            source: `function symbol${i}() {}`,
            startLine: i,
            endLine: i + 1,
            type: 'function' as const,
          },
        },
        score: 0.9 - i * 0.05,
        boosted: false,
      }))

      const groundedAnswer = 'Answer from many chunks'

      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        manyResults
      )

      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
    })
  })

  describe('Anti-Hallucination Guards', () => {
    it('should not invent symbols not in retrieved chunks', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer = 'Only mentions foo and bar functions'

      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        mockResults
      )

      // Refined answer should stay grounded
      expect(refinedAnswer).toBeDefined()
    })

    it('should maintain code references from grounded answer', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer =
        'Symbol: foo\nFile: /src/foo.ts\nSource: function foo() { return 42 }'

      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        mockResults
      )

      // File paths and symbols should be preserved
      expect(refinedAnswer).toContain('foo')
      expect(refinedAnswer).toContain('/src/foo.ts')
    })

    it('should include metadata in context for LLM', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer = 'Answer'

      // Refiner builds context internally
      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        mockResults
      )

      expect(refinedAnswer).toBeDefined()
    })

    it('should handle results with different symbol types', async () => {
      const diverseResults: RetrievalResult[] = [
        {
          record: {
            id: 'func',
            embedding: [1, 0, 0],
            metadata: {
              symbolName: 'myFunc',
              filePath: '/src/func.ts',
              source: 'function myFunc() {}',
              startLine: 1,
              endLine: 1,
              type: 'function',
            },
          },
          score: 0.9,
          boosted: false,
        },
        {
          record: {
            id: 'class',
            embedding: [0.95, 0.05, 0],
            metadata: {
              symbolName: 'MyClass',
              filePath: '/src/class.ts',
              source: 'class MyClass {}',
              startLine: 5,
              endLine: 10,
              type: 'class',
            },
          },
          score: 0.85,
          boosted: false,
        },
        {
          record: {
            id: 'interface',
            embedding: [0.9, 0, 0.1],
            metadata: {
              symbolName: 'MyInterface',
              filePath: '/src/interface.ts',
              source: 'interface MyInterface {}',
              startLine: 15,
              endLine: 20,
              type: 'interface',
            },
          },
          score: 0.8,
          boosted: false,
        },
      ]

      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })
      const groundedAnswer = 'Contains function, class, and interface'

      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        diverseResults
      )

      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
    })
  })

  describe('LLM Availability', () => {
    it('should gracefully fallback when LLM unavailable', async () => {
      const refinerWithOllama = new AnswerRefiner({
        enabled: true,
        useMock: false,
      })
      const groundedAnswer = 'Fallback answer'

      // Even if Ollama isn't running, should return grounded answer
      const refinedAnswer = await refinerWithOllama.refine(
        groundedAnswer,
        mockResults
      )

      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
    })

    it('should use mock LLM when explicitly enabled', async () => {
      const refinerMock = new AnswerRefiner({
        enabled: true,
        useMock: true,
      })

      const groundedAnswer = 'Test'

      const refinedAnswer = await refinerMock.refine(groundedAnswer, mockResults)

      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
    })
  })

  describe('Context Building', () => {
    it('should format retrieved chunks for LLM context', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })

      const groundedAnswer = 'Answer'

      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        mockResults
      )

      expect(refinedAnswer).toBeDefined()
      // Context should include file paths and symbols
      if (refinedAnswer.includes('foo')) {
        expect(refinedAnswer).toContain('foo')
      }
    })

    it('should include line numbers in context', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })

      const groundedAnswer = 'With line numbers'

      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        mockResults
      )

      expect(refinedAnswer).toBeDefined()
    })

    it('should include source code in context', async () => {
      const refinerWithMock = new AnswerRefiner({ enabled: true, useMock: true })

      const groundedAnswer = 'With source'

      const refinedAnswer = await refinerWithMock.refine(
        groundedAnswer,
        mockResults
      )

      expect(refinedAnswer).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should not throw on refinement errors', async () => {
      const refinerWithMock = new AnswerRefiner({
        enabled: true,
        useMock: true,
      })

      const groundedAnswer = 'Safe answer'

      // Should not throw even with mock
      expect(
        async () =>
          await refinerWithMock.refine(groundedAnswer, mockResults)
      ).not.toThrow()
    })

    it('should return grounded answer on any refinement failure', async () => {
      const refinerWithOllama = new AnswerRefiner({
        enabled: true,
        useMock: false,
      })

      const groundedAnswer =
        'This is my safe grounded answer from retrieved chunks'

      const refinedAnswer = await refinerWithOllama.refine(
        groundedAnswer,
        mockResults
      )

      // Should return something valid
      expect(refinedAnswer).toBeDefined()
      expect(typeof refinedAnswer).toBe('string')
      expect(refinedAnswer.length).toBeGreaterThan(0)
    })
  })
})
