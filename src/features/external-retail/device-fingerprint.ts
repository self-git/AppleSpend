import type { DeviceFingerprintSource } from '@/features/transactions/transaction-model'

const SECRET_KEY = 'apple-ledger-device-fingerprint-secret-v1'
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export interface DeviceFingerprintSet {
  deviceFingerprint?: string
  snFingerprint?: string
  imeiFingerprints: string[]
  fingerprintAlgorithm?: 'hmac-sha256-v1'
  fingerprintSources: DeviceFingerprintSource[]
}

export async function createDeviceFingerprints(sn: string | undefined, imeis: string[]): Promise<DeviceFingerprintSet> {
  const normalizedSn = normalizeSn(sn)
  const normalizedImeis = Array.from(new Set(imeis.map(normalizeImei).filter(Boolean)))
  const snFingerprint = normalizedSn ? await hmacFingerprint('sn', normalizedSn, 'SN') : undefined
  const imeiFingerprints = await Promise.all(normalizedImeis.map((imei) => hmacFingerprint('imei', imei, 'IMEI')))
  const fingerprintSources: DeviceFingerprintSource[] = [
    ...(snFingerprint ? (['invoice_sn'] as const) : []),
    ...imeiFingerprints.map((_, index) => (index === 0 ? 'invoice_imei1' : 'invoice_imei2') as DeviceFingerprintSource),
  ]

  return {
    deviceFingerprint: snFingerprint || imeiFingerprints[0],
    snFingerprint,
    imeiFingerprints,
    fingerprintAlgorithm: snFingerprint || imeiFingerprints.length ? 'hmac-sha256-v1' : undefined,
    fingerprintSources,
  }
}

export function normalizeSn(value: string | undefined): string {
  return String(value ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
}

export function normalizeImei(value: string | undefined): string {
  return String(value ?? '').replace(/\D/g, '')
}

async function hmacFingerprint(kind: 'sn' | 'imei', value: string, prefix: 'SN' | 'IMEI'): Promise<string> {
  const secret = await getOrCreateSecret()
  const keyBytes = secret.buffer.slice(secret.byteOffset, secret.byteOffset + secret.byteLength) as ArrayBuffer
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${kind}:${value}`))
  return `${prefix}-${base32(new Uint8Array(signature)).slice(0, 12)}`
}

async function getOrCreateSecret(): Promise<Uint8Array> {
  const existing = localStorage.getItem(SECRET_KEY)
  if (existing) return base64ToBytes(existing)

  const secret = crypto.getRandomValues(new Uint8Array(32))
  localStorage.setItem(SECRET_KEY, bytesToBase64(secret))
  return secret
}

function base32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''

  bytes.forEach((byte) => {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  })

  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
