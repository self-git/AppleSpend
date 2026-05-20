export interface SensitiveIdentifiers {
  sn?: string
  imeis: string[]
}

export function extractSensitiveIdentifiers(text: string): SensitiveIdentifiers {
  const sn = text.match(/\bSN\s*[:：]\s*([A-Z0-9]{6,24})/i)?.[1]
  const imeis = Array.from(text.matchAll(/\bIMEI\s*\d?\s*[:：]\s*(\d{14,17})/gi))
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value))
  return { sn, imeis: Array.from(new Set(imeis)) }
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(/\bSN\s*[:：]\s*[A-Z0-9]{6,24}/gi, 'SN:[REDACTED]')
    .replace(/\bIMEI\s*1\s*[:：]\s*\d{14,17}/gi, 'IMEI1:[REDACTED]')
    .replace(/\bIMEI\s*2\s*[:：]\s*\d{14,17}/gi, 'IMEI2:[REDACTED]')
    .replace(/\bIMEI\s*[:：]\s*\d{14,17}/gi, 'IMEI:[REDACTED]')
    .replace(/\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, '[ID_REDACTED]')
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, '[PHONE_REDACTED]')
}
