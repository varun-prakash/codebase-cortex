import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseFileToSymbols } from '../../src/parser/astParser'

describe('AST Parser', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(process.cwd(), 'tests', 'tmp_parser_test')
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (_) {}
  })

  describe('parseFileToSymbols', () => {
    it('should extract function declarations', () => {
      const content = `export function greet(name: string): string {
  return \`Hello \${name}\`
}`
      const filePath = path.join(tmpDir, 'test.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      expect(chunks.length).toBeGreaterThan(0)
      const greetChunk = chunks.find(c => c.symbolName === 'greet')
      expect(greetChunk).toBeDefined()
      expect(greetChunk?.type).toBe('function')
      expect(greetChunk?.source).toContain('function greet')
    })

    it('should extract class declarations with methods', () => {
      const content = `export class Calculator {
  add(a: number, b: number): number {
    return a + b
  }

  subtract(a: number, b: number): number {
    return a - b
  }
}`
      const filePath = path.join(tmpDir, 'calculator.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      const classChunk = chunks.find(c => c.symbolName === 'Calculator' && c.type === 'class')
      expect(classChunk).toBeDefined()
      expect(classChunk?.source).toContain('class Calculator')

      const addMethod = chunks.find(c => c.symbolName === 'add' && c.type === 'method')
      expect(addMethod).toBeDefined()
      expect(addMethod?.parent).toBe('Calculator')

      const subtractMethod = chunks.find(c => c.symbolName === 'subtract' && c.type === 'method')
      expect(subtractMethod).toBeDefined()
      expect(subtractMethod?.parent).toBe('Calculator')
    })

    it('should extract interface declarations', () => {
      const content = `export interface User {
  id: string
  name: string
  email: string
}`
      const filePath = path.join(tmpDir, 'user.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      const interfaceChunk = chunks.find(c => c.symbolName === 'User' && c.type === 'interface')
      expect(interfaceChunk).toBeDefined()
      expect(interfaceChunk?.source).toContain('interface User')
    })

    it('should preserve line numbers', () => {
      const content = `// line 1
// line 2
export function test() {
  // line 4
  return true
}
// line 7`
      const filePath = path.join(tmpDir, 'lines.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      const testChunk = chunks.find(c => c.symbolName === 'test')
      expect(testChunk).toBeDefined()
      expect(testChunk?.startLine).toBe(3)
      expect(testChunk?.endLine).toBeGreaterThanOrEqual(5)
    })

    it('should handle multiple symbols in one file', () => {
      const content = `export function helper1() {}
export function helper2() {}
export class MyClass {
  method1() {}
  method2() {}
}
export interface Config {
  value: string
}`
      const filePath = path.join(tmpDir, 'multi.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      expect(chunks.length).toBeGreaterThanOrEqual(6) // 2 functions + class + 2 methods + interface
    })

    it('should handle nested classes (extract parent)', () => {
      const content = `export class OuterClass {
  innerMethod() {
    return 42
  }
}`
      const filePath = path.join(tmpDir, 'nested.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      const methodChunk = chunks.find(c => c.symbolName === 'innerMethod')
      expect(methodChunk).toBeDefined()
      expect(methodChunk?.parent).toBe('OuterClass')
    })

    it('should handle empty files', () => {
      const content = ''
      const filePath = path.join(tmpDir, 'empty.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      expect(Array.isArray(chunks)).toBe(true)
      expect(chunks.length).toBe(0)
    })

    it('should handle files with only comments', () => {
      const content = `// This is a comment
// Another comment
/* Block comment */`
      const filePath = path.join(tmpDir, 'comments.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      expect(chunks.length).toBe(0)
    })

    it('should generate unique chunk IDs', () => {
      const content = `export function a() {}
export function b() {}
export function c() {}`
      const filePath = path.join(tmpDir, 'ids.ts')
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)
      const ids = chunks.map(c => c.id)

      expect(new Set(ids).size).toBe(ids.length) // All unique
    })

    it('should include file path in chunks', () => {
      const content = `export function test() {}`
      const filePath = path.join(tmpDir, 'subdir', 'myfile.ts')
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, content, 'utf8')

      const chunks = parseFileToSymbols(filePath)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].filePath).toBe(filePath)
    })
  })
})
