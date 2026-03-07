"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const astParser_1 = require("../../src/parser/astParser");
(0, vitest_1.describe)('AST Parser', () => {
    let tmpDir;
    (0, vitest_1.beforeEach)(() => {
        tmpDir = path_1.default.join(process.cwd(), 'tests', 'tmp_parser_test');
        fs_1.default.mkdirSync(tmpDir, { recursive: true });
    });
    (0, vitest_1.afterEach)(() => {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch (_) { }
    });
    (0, vitest_1.describe)('parseFileToSymbols', () => {
        (0, vitest_1.it)('should extract function declarations', () => {
            const content = `export function greet(name: string): string {
  return \`Hello \${name}\`
}`;
            const filePath = path_1.default.join(tmpDir, 'test.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
            const greetChunk = chunks.find(c => c.symbolName === 'greet');
            (0, vitest_1.expect)(greetChunk).toBeDefined();
            (0, vitest_1.expect)(greetChunk?.type).toBe('function');
            (0, vitest_1.expect)(greetChunk?.source).toContain('function greet');
        });
        (0, vitest_1.it)('should extract class declarations with methods', () => {
            const content = `export class Calculator {
  add(a: number, b: number): number {
    return a + b
  }

  subtract(a: number, b: number): number {
    return a - b
  }
}`;
            const filePath = path_1.default.join(tmpDir, 'calculator.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            const classChunk = chunks.find(c => c.symbolName === 'Calculator' && c.type === 'class');
            (0, vitest_1.expect)(classChunk).toBeDefined();
            (0, vitest_1.expect)(classChunk?.source).toContain('class Calculator');
            const addMethod = chunks.find(c => c.symbolName === 'add' && c.type === 'method');
            (0, vitest_1.expect)(addMethod).toBeDefined();
            (0, vitest_1.expect)(addMethod?.parent).toBe('Calculator');
            const subtractMethod = chunks.find(c => c.symbolName === 'subtract' && c.type === 'method');
            (0, vitest_1.expect)(subtractMethod).toBeDefined();
            (0, vitest_1.expect)(subtractMethod?.parent).toBe('Calculator');
        });
        (0, vitest_1.it)('should extract interface declarations', () => {
            const content = `export interface User {
  id: string
  name: string
  email: string
}`;
            const filePath = path_1.default.join(tmpDir, 'user.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            const interfaceChunk = chunks.find(c => c.symbolName === 'User' && c.type === 'interface');
            (0, vitest_1.expect)(interfaceChunk).toBeDefined();
            (0, vitest_1.expect)(interfaceChunk?.source).toContain('interface User');
        });
        (0, vitest_1.it)('should preserve line numbers', () => {
            const content = `// line 1
// line 2
export function test() {
  // line 4
  return true
}
// line 7`;
            const filePath = path_1.default.join(tmpDir, 'lines.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            const testChunk = chunks.find(c => c.symbolName === 'test');
            (0, vitest_1.expect)(testChunk).toBeDefined();
            (0, vitest_1.expect)(testChunk?.startLine).toBe(3);
            (0, vitest_1.expect)(testChunk?.endLine).toBeGreaterThanOrEqual(5);
        });
        (0, vitest_1.it)('should handle multiple symbols in one file', () => {
            const content = `export function helper1() {}
export function helper2() {}
export class MyClass {
  method1() {}
  method2() {}
}
export interface Config {
  value: string
}`;
            const filePath = path_1.default.join(tmpDir, 'multi.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            (0, vitest_1.expect)(chunks.length).toBeGreaterThanOrEqual(6); // 2 functions + class + 2 methods + interface
        });
        (0, vitest_1.it)('should handle nested classes (extract parent)', () => {
            const content = `export class OuterClass {
  innerMethod() {
    return 42
  }
}`;
            const filePath = path_1.default.join(tmpDir, 'nested.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            const methodChunk = chunks.find(c => c.symbolName === 'innerMethod');
            (0, vitest_1.expect)(methodChunk).toBeDefined();
            (0, vitest_1.expect)(methodChunk?.parent).toBe('OuterClass');
        });
        (0, vitest_1.it)('should handle empty files', () => {
            const content = '';
            const filePath = path_1.default.join(tmpDir, 'empty.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            (0, vitest_1.expect)(Array.isArray(chunks)).toBe(true);
            (0, vitest_1.expect)(chunks.length).toBe(0);
        });
        (0, vitest_1.it)('should handle files with only comments', () => {
            const content = `// This is a comment
// Another comment
/* Block comment */`;
            const filePath = path_1.default.join(tmpDir, 'comments.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            (0, vitest_1.expect)(chunks.length).toBe(0);
        });
        (0, vitest_1.it)('should generate unique chunk IDs', () => {
            const content = `export function a() {}
export function b() {}
export function c() {}`;
            const filePath = path_1.default.join(tmpDir, 'ids.ts');
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            const ids = chunks.map(c => c.id);
            (0, vitest_1.expect)(new Set(ids).size).toBe(ids.length); // All unique
        });
        (0, vitest_1.it)('should include file path in chunks', () => {
            const content = `export function test() {}`;
            const filePath = path_1.default.join(tmpDir, 'subdir', 'myfile.ts');
            fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            const chunks = (0, astParser_1.parseFileToSymbols)(filePath);
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(chunks[0].filePath).toBe(filePath);
        });
    });
});
