"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const assert_1 = __importDefault(require("assert"));
const indexer_1 = require("../src/indexer/indexer");
const embeddings_1 = require("../src/embeddings/embeddings");
const vectorStore_1 = require("../src/retriever/vectorStore");
const generator_1 = require("../src/generator/generator");
async function runIntegration() {
    const tmpDir = path_1.default.join(process.cwd(), 'tests', 'tmp_project');
    fs_1.default.mkdirSync(tmpDir, { recursive: true });
    const filePath = path_1.default.join(tmpDir, 'sample.ts');
    const content = `export function greet(name: string) {\n  return ` + "`Hello ${name}`" + `\n}`;
    fs_1.default.writeFileSync(filePath, content, 'utf8');
    const idx = new indexer_1.Indexer({ rootDir: tmpDir });
    const chunks = idx.indexAll();
    (0, assert_1.default)(chunks.length >= 1, 'expected at least one chunk extracted');
    const store = new vectorStore_1.InMemoryVectorStore();
    for (const c of chunks) {
        const er = await (0, embeddings_1.chunkToEmbeddingRecord)(c);
        store.add(er);
    }
    const answer = await (0, generator_1.generateAnswerFromQueryAsync)('greet function', store, { debug: true });
    console.log('integration answer:\n', answer);
    (0, assert_1.default)(answer !== 'Insufficient context to answer', 'expected the engine to find context for greet');
    // cleanup
    try {
        fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
    }
    catch (_) { }
}
if (require.main === module) {
    runIntegration()
        .then(() => console.log('integration test passed'))
        .catch((e) => {
        console.error('integration test failed', e);
        process.exit(1);
    });
}
