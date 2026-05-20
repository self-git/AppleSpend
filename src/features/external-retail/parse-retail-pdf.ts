import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { ExternalRetailParseResult } from './external-retail-model'
import { parseExternalRetailInvoiceText } from './parse-invoice-text'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function parseExternalRetailPdf(file: File): Promise<ExternalRetailParseResult> {
  const text = await extractPdfText(file)
  const draft = await parseExternalRetailInvoiceText(text, file.name)
  const warnings = [
    !text.trim() ? 'PDF 未抽取到文本，可能是扫描件；当前版本暂不支持 OCR。' : '',
    text.trim() && !draft ? '文件文本不像电子发票，未生成导入草稿。' : '',
  ].filter(Boolean)

  return { draft, text, warnings }
}

export async function extractPdfText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const document = await pdfjs.getDocument({ data: bytes }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(
      (content.items as Array<{ str?: string }>)
        .map((item) => item.str)
        .filter((value): value is string => Boolean(value))
        .join('\n'),
    )
  }

  await document.destroy()
  return pages.join('\n\n')
}
