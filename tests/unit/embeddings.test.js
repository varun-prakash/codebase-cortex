"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const embeddings_1 = require("../../src/embeddings/embeddings");
(0, vitest_1.describe)('Embeddings', () => {
    (0, vitest_1.describe)('embedTextDeterministic (fallback)', () => {
        (0, vitest_1.it)('should produce consistent vectors for the same input', () => {
            const text = 'export function greet(name: string) { return `Hello ${name}` }';
            const vec1 = (0, embeddings_1.embedTextDeterministic)(text);
            const vec2 = (0, embeddings_1.embedTextDeterministic)(text);
            (0, vitest_1.expect)(vec1).toEqual(vec2);
        });
        (0, vitest_1.it)('should produce normalized vectors with magnitude ~1', () => {
            const text = 'test code snippet';
            const vec = (0, embeddings_1.embedTextDeterministic)(text);
            const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
            (0, vitest_1.expect)(magnitude).toBeCloseTo(1.0, 2);
        });
        (0, vitest_1.it)('should produce 384-dimensional vectors by default', () => {
            const text = 'const x = 42';
            const vec = (0, embeddings_1.embedTextDeterministic)(text);
            (0, vitest_1.expect)(vec.length).toBe(384);
        });
        (0, vitest_1.it)('should produce different vectors for different inputs', () => {
            const vec1 = (0, embeddings_1.embedTextDeterministic)('function foo() {}');
            const vec2 = (0, embeddings_1.embedTextDeterministic)('function bar() {}');
            (0, vitest_1.expect)(vec1).not.toEqual(vec2);
        });
        (0, vitest_1.it)('should handle empty strings', () => {
            const vec = (0, embeddings_1.embedTextDeterministic)('');
            (0, vitest_1.expect)(vec.length).toBe(384);
            (0, vitest_1.expect)(vec.every(v => v === 0)).toBe(true);
        });
        (0, vitest_1.it)('should handle long texts', () => {
            const longText = 'x'.repeat(10000);
            const vec = (0, embeddings_1.embedTextDeterministic)(longText);
            (0, vitest_1.expect)(vec.length).toBe(384);
            (0, vitest_1.expect)(vec.some(v => v !== 0)).toBe(true);
        });
        (0, vitest_1.it)('should support custom dimensions', () => {
            const text = 'test';
            const vec128 = (0, embeddings_1.embedTextDeterministic)(text, 128);
            const vec256 = (0, embeddings_1.embedTextDeterministic)(text, 256);
            (0, vitest_1.expect)(vec128.length).toBe(128);
            (0, vitest_1.expect)(vec256.length).toBe(256);
        });
        (0, vitest_1.it)('should be deterministic across multiple runs', () => {
            const text = 'deterministic test';
            const vectors = Array.from({ length: 5 }, () => (0, embeddings_1.embedTextDeterministic)(text));
            for (let i = 1; i < vectors.length; i++) {
                (0, vitest_1.expect)(vectors[i]).toEqual(vectors[0]);
            }
        });
    });
    (0, vitest_1.describe)('Chunk to Embedding Record conversion', () => {
        (0, vitest_1.it)('should include all chunk metadata', async () => {
            const { chunkToEmbeddingRecord } = await Promise.resolve().then(() => __importStar(require('../../src/embeddings/embeddings')));
            const chunk = {
                id: 'test:foo:1',
                symbolName: 'foo',
                filePath: '/test/file.ts',
                source: 'function foo() {}',
                startLine: 1,
                endLine: 1,
                type: 'function',
            };
            const record = await chunkToEmbeddingRecord(chunk);
            (0, vitest_1.expect)(record.metadata.symbolName).toBe('foo');
            (0, vitest_1.expect)(record.metadata.filePath).toBe('/test/file.ts');
            (0, vitest_1.expect)(record.metadata.source).toBe('function foo() {}');
            (0, vitest_1.expect)(record.metadata.startLine).toBe(1);
            (0, vitest_1.expect)(record.metadata.endLine).toBe(1);
            (0, vitest_1.expect)(record.metadata.type).toBe('function');
        });
        (0, vitest_1.it)('should produce an embedding vector', async () => {
            const { chunkToEmbeddingRecord } = await Promise.resolve().then(() => __importStar(require('../../src/embeddings/embeddings')));
            const chunk = {
                id: 'test:bar:10',
                symbolName: 'bar',
                filePath: '/test/file.ts',
                source: 'const bar = 42',
                startLine: 10,
                endLine: 10,
                type: undefined,
            };
            const record = await chunkToEmbeddingRecord(chunk);
            (0, vitest_1.expect)(record.embedding).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(record.embedding)).toBe(true);
            (0, vitest_1.expect)(record.embedding.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should preserve parent relationship', async () => {
            const { chunkToEmbeddingRecord } = await Promise.resolve().then(() => __importStar(require('../../src/embeddings/embeddings')));
            const chunk = {
                id: 'test:method:1',
                symbolName: 'doSomething',
                filePath: '/test/class.ts',
                source: 'doSomething() {}',
                startLine: 5,
                endLine: 7,
                parent: 'MyClass',
                type: 'method',
            };
            const record = await chunkToEmbeddingRecord(chunk);
            (0, vitest_1.expect)(record.metadata.parent).toBe('MyClass');
        });
    });
});
