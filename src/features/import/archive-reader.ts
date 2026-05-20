import JSZip from 'jszip'

export interface ImportableTextFile {
  name: string
  path: string
  text(): Promise<string>
}

export async function expandImportFiles(files: File[]): Promise<ImportableTextFile[]> {
  const expanded: ImportableTextFile[] = []

  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      expanded.push(...(await extractZipEntries(file)))
      continue
    }

    expanded.push({
      name: file.name,
      path: file.name,
      text: () => file.text(),
    })
  }

  return expanded
}

async function extractZipEntries(file: File): Promise<ImportableTextFile[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const entries: ImportableTextFile[] = []

  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir || !entry.name.toLowerCase().endsWith('.csv')) return
      entries.push({
        name: entry.name.split('/').pop() ?? entry.name,
        path: `${file.name}:${entry.name}`,
        text: () => entry.async('text'),
      })
    }),
  )

  return entries.sort((a, b) => a.path.localeCompare(b.path))
}
