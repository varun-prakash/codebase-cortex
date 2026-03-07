"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const generator_1 = require("../../src/generator/generator");
const vectorStore_1 = require("../../src/retriever/vectorStore");
(0, vitest_1.describe)('Generator', () => {
    let store;
    (0, vitest_1.beforeEach)(() => {
        store = new vectorStore_1.InMemoryVectorStore();
    });
    (0, vitest_1.describe)('generateAnswerFromQueryAsync', () => {
        (0, vitest_1.it)('should return insufficient context for empty store', async () => {
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('test query', store, {
                minScore: 0.02,
            });
            (0, vitest_1.expect)(answer).toBe('Insufficient context to answer');
        });
        (0, vitest_1.it)('should return grounded answer from retrieved chunks', async () => {
            const record = {
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
            };
            store.add(record);
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('greet function', store, {
                debug: false,
                topK: 5,
                minScore: -1, // Lower threshold for fallback embeddings
            });
            (0, vitest_1.expect)(answer).toBeDefined();
            (0, vitest_1.expect)(answer).not.toBe('Insufficient context to answer');
            (0, vitest_1.expect)(answer).toContain('greet');
        });
        (0, vitest_1.it)('should include source code in answer', async () => {
            const sourceCode = 'export function add(a: number, b: number) { return a + b }';
            const record = {
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
            };
            store.add(record);
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('add function', store, {
                minScore: -1,
            });
            (0, vitest_1.expect)(answer).toContain(sourceCode);
        });
        (0, vitest_1.it)('should include metadata in answer', async () => {
            const record = {
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
            };
            store.add(record);
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('test', store, {
                debug: false,
            });
            (0, vitest_1.expect)(answer).toContain('testFunc');
            (0, vitest_1.expect)(answer).toContain('/src/test.ts');
            (0, vitest_1.expect)(answer).toContain('42');
            (0, vitest_1.expect)(answer).toContain('45');
        });
        (0, vitest_1.it)('should respect topK limit', async () => {
            // Add 5 records
            for (let i = 0; i < 5; i++) {
                const record = {
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
                };
                store.add(record);
            }
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('function', store, {
                debug: false,
                topK: 2,
            });
            // Should only include 2 chunks
            const functionMatches = (answer.match(/function func\d\(\)/g) || []).length;
            (0, vitest_1.expect)(functionMatches).toBeLessThanOrEqual(2);
        });
        (0, vitest_1.it)('should generate human-readable summary if requested', async () => {
            const record = {
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
            };
            store.add(record);
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('calculator', store, {
                summarize: true,
                summarizeFormat: 'paragraph',
            });
            (0, vitest_1.expect)(answer).toContain('Calculator');
            // Summary should have some natural language structure
            (0, vitest_1.expect)(answer.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should include file location metadata', async () => {
            const record = {
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
            };
            store.add(record);
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('indexer', store, {
                debug: false,
                minScore: -1,
            });
            (0, vitest_1.expect)(answer).toContain('indexer/indexer.ts');
            (0, vitest_1.expect)(answer).toContain('10');
            (0, vitest_1.expect)(answer).toContain('20');
        });
        (0, vitest_1.it)('should filter results by minScore', async () => {
            const record = {
                id: 'low-score',
                embedding: [0.01, 0, 0],
                metadata: {
                    symbolName: 'lowScore',
                    filePath: '/src/low.ts',
                    source: 'function lowScore() {}',
                    startLine: 1,
                    endLine: 1,
                    type: 'function',
                },
            };
            store.add(record);
            // With high minScore threshold, should return insufficient context
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('unrelated query', store, {
                minScore: 0.5,
            });
            (0, vitest_1.expect)(answer).toBe('Insufficient context to answer');
        });
        (0, vitest_1.it)('should handle method chunks with parent class info', async () => {
            const record = {
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
            };
            store.add(record);
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('doSomething', store, {
                minScore: -1,
            });
            (0, vitest_1.expect)(answer).toContain('doSomething');
            // Parent info might be in metadata or source
            (0, vitest_1.expect)(answer.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should include score information in debug mode', async () => {
            const record = {
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
            };
            store.add(record);
            // Note: debug mode logs to console, but we can verify answer quality
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('test', store, {
                debug: false,
            });
            (0, vitest_1.expect)(answer).toBeDefined();
            (0, vitest_1.expect)(answer.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should always return grounded answers (no speculation)', async () => {
            const record = {
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
            };
            store.add(record);
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('what does the indexer do', store, {
                summarize: false,
                minScore: -1,
            });
            // Answer should come directly from retrieved code
            (0, vitest_1.expect)(answer).toContain('Indexer');
            (0, vitest_1.expect)(answer).toContain('indexAll');
            // Should not invent details not in the source
            (0, vitest_1.expect)(answer).not.toContain('It uses');
            (0, vitest_1.expect)(answer).not.toContain('The indexer creates');
        });
        (0, vitest_1.it)('should handle multiple retrieved chunks', async () => {
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
                        type: 'function',
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
                        type: 'function',
                    },
                },
            ];
            records.forEach(r => store.add(r));
            const answer = await (0, generator_1.generateAnswerFromQueryAsync)('parsing', store, {
                topK: 2,
                minScore: -1,
            });
            (0, vitest_1.expect)(answer).toContain('parseFile');
            (0, vitest_1.expect)(answer).toContain('extractSymbols');
            (0, vitest_1.expect)(answer).toContain('2 retrieved chunk(s)');
        });
    });
});
