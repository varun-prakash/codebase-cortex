import fs from 'fs'
import path from 'path'
import ts from 'typescript'
import { SymbolChunk } from '../types'

function readFileUtf8(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

function lineRangeFromNode(sourceFile: ts.SourceFile, node: ts.Node) {
  const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
  return { startLine: startLine + 1, endLine: endLine + 1 }
}

function sliceSourceByLines(text: string, startLine: number, endLine: number) {
  const lines = text.split(/\r?\n/)
  return lines.slice(startLine - 1, endLine).join('\n')
}

export function parseFileToSymbols(filePath: string): SymbolChunk[] {
  const text = readFileUtf8(filePath)
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.ESNext, true)
  const chunks: SymbolChunk[] = []

  function visit(node: ts.Node, parentName?: string | null) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const { startLine, endLine } = lineRangeFromNode(sf, node)
      const source = sliceSourceByLines(text, startLine, endLine)
      const name = node.name.getText()
      const id = `${filePath}:${name}:${startLine}`
      chunks.push({ id, symbolName: name, filePath, source, startLine, endLine, parent: null, type: 'function' })
    }

    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.getText()
      const { startLine, endLine } = lineRangeFromNode(sf, node)
      const source = sliceSourceByLines(text, startLine, endLine)
      const id = `${filePath}:class:${className}:${startLine}`
      chunks.push({ id, symbolName: className, filePath, source, startLine, endLine, parent: null, type: 'class' })

      // collect methods as separate chunks
      node.members.forEach((m) => {
        if ((ts.isMethodDeclaration(m) || ts.isMethodSignature(m)) && m.name) {
          const methodName = m.name.getText()
          const { startLine: ms, endLine: me } = lineRangeFromNode(sf, m)
          const msource = sliceSourceByLines(text, ms, me)
          const mid = `${filePath}:method:${className}.${methodName}:${ms}`
          chunks.push({ id: mid, symbolName: methodName, filePath, source: msource, startLine: ms, endLine: me, parent: className, type: 'method' })
        }
      })
    }

    if (ts.isInterfaceDeclaration(node) && node.name) {
      const name = node.name.getText()
      const { startLine, endLine } = lineRangeFromNode(sf, node)
      const source = sliceSourceByLines(text, startLine, endLine)
      const id = `${filePath}:interface:${name}:${startLine}`
      chunks.push({ id, symbolName: name, filePath, source, startLine, endLine, parent: null, type: 'interface' })
    }

    ts.forEachChild(node, (n) => visit(n, parentName))
  }

  visit(sf, null)
  return chunks
}

export function scanDirectoryForFiles(rootDir: string, extensions = ['.ts', '.js']): string[] {
  const results: string[] = []
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        walk(full)
        continue
      }
      if (e.isFile() && extensions.includes(path.extname(e.name))) {
        results.push(full)
      }
    }
  }
  walk(rootDir)
  return results
}
