import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5068'

export type SocialLink = {
  platform: string
  url: string
}

export type StorageSettings = {
  provider: 'Local' | 'S3' | string
  endpoint: string | null
  bucket: string | null
  accessKey: string | null
  secretKey: string | null
  region: string | null
  publicBaseUrl: string | null
}

export type SiteSettings = {
  name: string
  title: string
  keyword: string | null
  description: string | null
  logoUrl: string | null
  socialLinks: SocialLink[]
  contactAddresses: string[]
  contactPhones: string[]
  contactEmails: string[]
  storage: StorageSettings
  updatedAtUtc: string
  languagePrefix?: string | null
}

export type UpdateSiteSettingsInput = {
  general: {
    name: string
    title: string
    keyword: string | null
    description: string | null
    logoUrl: string | null
  }
  social: {
    socialLinks: SocialLink[]
  }
  contact: {
    addresses: string[]
    phones: string[]
    emails: string[]
  }
  storage: {
    provider: string
    endpoint: string | null
    bucket: string | null
    accessKey: string | null
    secretKey: string | null
    region: string | null
    publicBaseUrl: string | null
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // ignore
  }
  return `Request failed (${response.status}).`
}

function authHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

function mapSettings(raw: Record<string, unknown>): SiteSettings {
  const storage = (raw.storage ?? raw.Storage ?? {}) as Record<string, unknown>
  const socialLinks = (raw.socialLinks ?? raw.SocialLinks ?? []) as Array<Record<string, unknown>>

  return {
    name: String(raw.name ?? raw.Name ?? ''),
    title: String(raw.title ?? raw.Title ?? ''),
    keyword: (raw.keyword ?? raw.Keyword ?? null) as string | null,
    description: (raw.description ?? raw.Description ?? null) as string | null,
    logoUrl: (raw.logoUrl ?? raw.LogoUrl ?? null) as string | null,
    socialLinks: socialLinks.map((item) => ({
      platform: String(item.platform ?? item.Platform ?? ''),
      url: String(item.url ?? item.Url ?? ''),
    })),
    contactAddresses: (raw.contactAddresses ?? raw.ContactAddresses ?? []) as string[],
    contactPhones: (raw.contactPhones ?? raw.ContactPhones ?? []) as string[],
    contactEmails: (raw.contactEmails ?? raw.ContactEmails ?? []) as string[],
    storage: {
      provider: String(storage.provider ?? storage.Provider ?? 'Local'),
      endpoint: (storage.endpoint ?? storage.Endpoint ?? null) as string | null,
      bucket: (storage.bucket ?? storage.Bucket ?? null) as string | null,
      accessKey: (storage.accessKey ?? storage.AccessKey ?? null) as string | null,
      secretKey: (storage.secretKey ?? storage.SecretKey ?? null) as string | null,
      region: (storage.region ?? storage.Region ?? null) as string | null,
      publicBaseUrl: (storage.publicBaseUrl ?? storage.PublicBaseUrl ?? null) as string | null,
    },
    updatedAtUtc: String(raw.updatedAtUtc ?? raw.UpdatedAtUtc ?? ''),
    languagePrefix: (raw.languagePrefix ?? raw.LanguagePrefix ?? null) as string | null,
  }
}

export function settingsAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export async function getSiteSettings(lang?: string): Promise<SiteSettings> {
  const qs = lang ? `?lang=${encodeURIComponent(lang)}` : ''
  const response = await fetch(`${API_URL}/api/admin/settings${qs}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error(await parseError(response))
  const raw = (await response.json()) as Record<string, unknown>
  return mapSettings(raw)
}

export async function updateSiteSettings(
  input: UpdateSiteSettingsInput,
  lang: string,
): Promise<SiteSettings> {
  const response = await fetch(
    `${API_URL}/api/admin/settings?lang=${encodeURIComponent(lang)}`,
    {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      general: {
        name: input.general.name,
        title: input.general.title,
        keyword: input.general.keyword,
        description: input.general.description,
        logoUrl: input.general.logoUrl,
      },
      social: {
        socialLinks: input.social.socialLinks.map((link) => ({
          platform: link.platform,
          url: link.url,
        })),
      },
      contact: {
        addresses: input.contact.addresses,
        phones: input.contact.phones,
        emails: input.contact.emails,
      },
      storage: {
        provider: input.storage.provider,
        endpoint: input.storage.endpoint,
        bucket: input.storage.bucket,
        accessKey: input.storage.accessKey,
        secretKey: input.storage.secretKey,
        region: input.storage.region,
        publicBaseUrl: input.storage.publicBaseUrl,
      },
    }),
  },
  )
  if (!response.ok) throw new Error(await parseError(response))
  const raw = (await response.json()) as Record<string, unknown>
  return mapSettings(raw)
}

export async function uploadSiteLogo(file: File): Promise<SiteSettings> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`${API_URL}/api/admin/settings/logo`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!response.ok) throw new Error(await parseError(response))
  const raw = (await response.json()) as Record<string, unknown>
  return mapSettings(raw)
}
