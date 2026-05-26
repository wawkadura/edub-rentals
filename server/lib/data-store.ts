import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const DATA_DIR = path.resolve(__dirname, '../../../edub-rentals-data')

const FILES = {
  records: 'records.json',
} as const

export type Domain = keyof typeof FILES

const DEFAULTS: Record<Domain, unknown> = {
  records: { schema_version: 1, records: [] },
}

function fileFor(domain: Domain): string {
  return path.join(DATA_DIR, FILES[domain])
}

export async function readDomain<T = unknown>(domain: Domain): Promise<T> {
  const filePath = fileFor(domain)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULTS[domain] as T
    }
    throw e
  }
}

export async function writeDomain(domain: Domain, data: unknown): Promise<void> {
  const filePath = fileFor(domain)
  const tmp = filePath + '.tmp'
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, filePath)
}
