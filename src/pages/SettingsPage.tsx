import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useState,
} from 'react'
import {
  getSiteSettings,
  settingsAssetUrl,
  updateSiteSettings,
  uploadSiteLogo,
  type SocialLink,
} from '../lib/settingsApi'
import { LanguageTabs, LocalizedFields } from '../components/LanguageTabs'
import { useLanguages } from '../hooks/useLanguages'
import './SettingsPage.css'

type SocialRow = SocialLink & { key: string }
type TextRow = { key: string; value: string }
type SettingsTab = 'website' | 'social' | 'contact' | 'storage'

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'website', label: 'Website' },
  { id: 'social', label: 'Social' },
  { id: 'contact', label: 'Contact' },
  { id: 'storage', label: 'Storage' },
]

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toTextRows(values: string[]): TextRow[] {
  if (values.length === 0) return [{ key: newKey(), value: '' }]
  return values.map((value) => ({ key: newKey(), value }))
}

function fromTextRows(rows: TextRow[]): string[] {
  return rows.map((row) => row.value.trim()).filter(Boolean)
}

const SOCIAL_PLATFORMS = [
  'Facebook',
  'Instagram',
  'X / Twitter',
  'LinkedIn',
  'YouTube',
  'Telegram',
  'WhatsApp',
  'TikTok',
  'Other',
]

export function SettingsPage() {
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
    hasLanguages,
  } = useLanguages()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [keyword, setKeyword] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [socialLinks, setSocialLinks] = useState<SocialRow[]>([
    { key: newKey(), platform: 'Instagram', url: '' },
  ])

  const [addresses, setAddresses] = useState<TextRow[]>([{ key: newKey(), value: '' }])
  const [phones, setPhones] = useState<TextRow[]>([{ key: newKey(), value: '' }])
  const [emails, setEmails] = useState<TextRow[]>([{ key: newKey(), value: '' }])

  const [storageProvider, setStorageProvider] = useState<'Local' | 'S3'>('Local')
  const [s3Endpoint, setS3Endpoint] = useState('')
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3AccessKey, setS3AccessKey] = useState('')
  const [s3SecretKey, setS3SecretKey] = useState('')
  const [s3Region, setS3Region] = useState('')
  const [s3PublicBaseUrl, setS3PublicBaseUrl] = useState('')
  const [secretPlaceholder, setSecretPlaceholder] = useState(false)

  const [activeTab, setActiveTab] = useState<SettingsTab>('website')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function refresh(activeLang: string) {
    setLoading(true)
    setError(null)
    try {
      const settings = await getSiteSettings(activeLang)
      setName(settings.name)
      setTitle(settings.title)
      setKeyword(settings.keyword ?? '')
      setDescription(settings.description ?? '')
      setLogoUrl(settings.logoUrl)

      setSocialLinks(
        settings.socialLinks.length > 0
          ? settings.socialLinks.map((link) => ({ ...link, key: newKey() }))
          : [{ key: newKey(), platform: 'Instagram', url: '' }],
      )

      setAddresses(toTextRows(settings.contactAddresses))
      setPhones(toTextRows(settings.contactPhones))
      setEmails(toTextRows(settings.contactEmails))

      setStorageProvider(settings.storage.provider === 'S3' ? 'S3' : 'Local')
      setS3Endpoint(settings.storage.endpoint ?? '')
      setS3Bucket(settings.storage.bucket ?? '')
      setS3AccessKey(settings.storage.accessKey ?? '')
      setS3SecretKey('')
      setSecretPlaceholder(Boolean(settings.storage.secretKey))
      setS3Region(settings.storage.region ?? '')
      setS3PublicBaseUrl(settings.storage.publicBaseUrl ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lang) {
      if (!langLoading) setLoading(false)
      return
    }
    void refresh(lang)
  }, [lang, langLoading])

  async function handleLogoChange(file: File | null) {
    if (!file) return
    setUploadingLogo(true)
    setError(null)
    setNotice(null)
    try {
      const settings = await uploadSiteLogo(file)
      setLogoUrl(settings.logoUrl)
      setNotice('Logo uploaded.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!lang) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const cleanedSocial = socialLinks
        .map((link) => ({
          platform: link.platform.trim(),
          url: link.url.trim(),
        }))
        .filter((link) => link.platform && link.url)

      const settings = await updateSiteSettings(
        {
          general: {
            name: name.trim(),
            title: title.trim(),
            keyword: keyword.trim() || null,
            description: description.trim() || null,
            logoUrl,
          },
          social: { socialLinks: cleanedSocial },
          contact: {
            addresses: fromTextRows(addresses),
            phones: fromTextRows(phones),
            emails: fromTextRows(emails),
          },
          storage: {
            provider: storageProvider,
            endpoint: s3Endpoint.trim() || null,
            bucket: s3Bucket.trim() || null,
            accessKey: s3AccessKey.trim() || null,
            secretKey: s3SecretKey.trim() || null,
            region: s3Region.trim() || null,
            publicBaseUrl: s3PublicBaseUrl.trim() || null,
          },
        },
        lang,
      )

      setLogoUrl(settings.logoUrl)
      setSecretPlaceholder(Boolean(settings.storage.secretKey))
      setS3SecretKey('')
      setNotice('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  function updateSocial(key: string, patch: Partial<SocialLink>) {
    setSocialLinks((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
  }

  function updateTextRow(
    setter: Dispatch<SetStateAction<TextRow[]>>,
    key: string,
    value: string,
  ) {
    setter((rows) => rows.map((row) => (row.key === key ? { ...row, value } : row)))
  }

  const logoPreview = settingsAssetUrl(logoUrl)

  return (
    <section className="settings-page">
      <header className="settings-heading">
        <h1>Settings</h1>
        <p>Website identity, social links, contact details, and file storage.</p>
      </header>

      {error ? <p className="settings-error">{error}</p> : null}
      {notice ? <p className="settings-notice">{notice}</p> : null}

      <LanguageTabs
        languages={languages}
        value={lang}
        onChange={setLang}
        loading={langLoading}
        error={langError}
        disabled={saving}
        direction={direction}
      />

      {langLoading || (lang && loading) ? (
        <p className="settings-muted">Loading settings…</p>
      ) : (
        <>
          <div className="settings-tabs" role="tablist" aria-label="Settings sections">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`settings-tab${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form className="settings-form" onSubmit={handleSubmit}>
            <section className="settings-card" hidden={activeTab !== 'website'}>
              <div className="settings-card-head">
                <h2>Website</h2>
                <p>Name, SEO fields, and logo for your site.</p>
              </div>

              <LocalizedFields direction={direction}>
                <div className="settings-grid-2">
                  <label>
                    Name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={activeTab === 'website'}
                      placeholder="Site name"
                    />
                  </label>
                  <label>
                    Title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required={activeTab === 'website'}
                      placeholder="Page title"
                    />
                  </label>
                </div>

                <label>
                  Keyword
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="seo, keywords, comma, separated"
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Short site description"
                  />
                </label>
              </LocalizedFields>

              <div className="settings-logo">
                <div className="settings-logo-preview">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Website logo" />
                  ) : (
                    <span>No logo</span>
                  )}
                </div>
                <label className="settings-logo-upload">
                  Upload logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      void handleLogoChange(file)
                      e.target.value = ''
                    }}
                  />
                  <span className="settings-logo-hint">
                    {uploadingLogo ? 'Uploading…' : 'PNG, JPG, WebP, GIF, or SVG'}
                  </span>
                </label>
              </div>
            </section>

            <section className="settings-card" hidden={activeTab !== 'social'}>
              <div className="settings-card-head">
                <h2>Social networks</h2>
                <p>Add profile or page URLs for your social channels.</p>
              </div>

              <div className="settings-repeat">
                {socialLinks.map((link) => (
                  <div className="settings-repeat-row" key={link.key}>
                    <label>
                      Platform
                      <select
                        value={link.platform}
                        onChange={(e) => updateSocial(link.key, { platform: e.target.value })}
                      >
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {platform}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="settings-grow">
                      Address / URL
                      <input
                        value={link.url}
                        onChange={(e) => updateSocial(link.key, { url: e.target.value })}
                        placeholder="https://"
                      />
                    </label>
                    <button
                      type="button"
                      className="settings-icon-btn"
                      onClick={() =>
                        setSocialLinks((rows) =>
                          rows.length === 1
                            ? [{ key: newKey(), platform: 'Instagram', url: '' }]
                            : rows.filter((row) => row.key !== link.key),
                        )
                      }
                      aria-label="Remove social link"
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="settings-secondary-btn"
                onClick={() =>
                  setSocialLinks((rows) => [
                    ...rows,
                    { key: newKey(), platform: 'Instagram', url: '' },
                  ])
                }
              >
                Add social network
              </button>
            </section>

            <section className="settings-card" hidden={activeTab !== 'contact'}>
              <div className="settings-card-head">
                <h2>Contact us</h2>
                <p>Multiple addresses, phone numbers, and emails.</p>
              </div>

              <LocalizedFields direction={direction}>
                <div className="settings-contact-block">
                  <h3>Addresses</h3>
                  {addresses.map((row) => (
                    <div className="settings-repeat-row" key={row.key}>
                      <label className="settings-grow">
                        Address
                        <input
                          value={row.value}
                          onChange={(e) => updateTextRow(setAddresses, row.key, e.target.value)}
                          placeholder="Street, city, country"
                        />
                      </label>
                      <button
                        type="button"
                        className="settings-icon-btn"
                        onClick={() =>
                          setAddresses((rows) =>
                            rows.length === 1
                              ? [{ key: newKey(), value: '' }]
                              : rows.filter((item) => item.key !== row.key),
                          )
                        }
                        aria-label="Remove address"
                      >
                        −
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="settings-secondary-btn"
                    onClick={() => setAddresses((rows) => [...rows, { key: newKey(), value: '' }])}
                  >
                    Add address
                  </button>
                </div>

                <div className="settings-contact-block">
                  <h3>Phones</h3>
                  {phones.map((row) => (
                    <div className="settings-repeat-row" key={row.key}>
                      <label className="settings-grow">
                        Phone
                        <input
                          value={row.value}
                          onChange={(e) => updateTextRow(setPhones, row.key, e.target.value)}
                          placeholder="+1 555 000 0000"
                        />
                      </label>
                      <button
                        type="button"
                        className="settings-icon-btn"
                        onClick={() =>
                          setPhones((rows) =>
                            rows.length === 1
                              ? [{ key: newKey(), value: '' }]
                              : rows.filter((item) => item.key !== row.key),
                          )
                        }
                        aria-label="Remove phone"
                      >
                        −
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="settings-secondary-btn"
                    onClick={() => setPhones((rows) => [...rows, { key: newKey(), value: '' }])}
                  >
                    Add phone
                  </button>
                </div>

                <div className="settings-contact-block">
                  <h3>Emails</h3>
                  {emails.map((row) => (
                    <div className="settings-repeat-row" key={row.key}>
                      <label className="settings-grow">
                        Email
                        <input
                          type="email"
                          value={row.value}
                          onChange={(e) => updateTextRow(setEmails, row.key, e.target.value)}
                          placeholder="hello@example.com"
                        />
                      </label>
                      <button
                        type="button"
                        className="settings-icon-btn"
                        onClick={() =>
                          setEmails((rows) =>
                            rows.length === 1
                              ? [{ key: newKey(), value: '' }]
                              : rows.filter((item) => item.key !== row.key),
                          )
                        }
                        aria-label="Remove email"
                      >
                        −
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="settings-secondary-btn"
                    onClick={() => setEmails((rows) => [...rows, { key: newKey(), value: '' }])}
                  >
                    Add email
                  </button>
                </div>
              </LocalizedFields>
            </section>

            <section className="settings-card" hidden={activeTab !== 'storage'}>
              <div className="settings-card-head">
                <h2>Storage</h2>
                <p>Choose where uploaded files are stored: local backend or S3-compatible storage.</p>
              </div>

              <div className="settings-storage-options">
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="storageProvider"
                    checked={storageProvider === 'Local'}
                    onChange={() => setStorageProvider('Local')}
                  />
                  <span>
                    <strong>Local backend</strong>
                    <small>Files are saved on this server under uploads.</small>
                  </span>
                </label>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="storageProvider"
                    checked={storageProvider === 'S3'}
                    onChange={() => setStorageProvider('S3')}
                  />
                  <span>
                    <strong>S3 storage</strong>
                    <small>AWS S3 or compatible providers (Wasabi, MinIO, R2, …).</small>
                  </span>
                </label>
              </div>

              {storageProvider === 'S3' ? (
                <div className="settings-grid-2">
                  <label>
                    Endpoint
                    <input
                      value={s3Endpoint}
                      onChange={(e) => setS3Endpoint(e.target.value)}
                      placeholder="https://s3.amazonaws.com"
                    />
                  </label>
                  <label>
                    Region
                    <input
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      placeholder="us-east-1"
                    />
                  </label>
                  <label>
                    Bucket
                    <input
                      value={s3Bucket}
                      onChange={(e) => setS3Bucket(e.target.value)}
                      placeholder="my-bucket"
                      required={activeTab === 'storage' && storageProvider === 'S3'}
                    />
                  </label>
                  <label>
                    Public base URL
                    <input
                      value={s3PublicBaseUrl}
                      onChange={(e) => setS3PublicBaseUrl(e.target.value)}
                      placeholder="https://cdn.example.com"
                    />
                  </label>
                  <label>
                    Access key
                    <input
                      value={s3AccessKey}
                      onChange={(e) => setS3AccessKey(e.target.value)}
                      placeholder="Access key ID"
                      required={activeTab === 'storage' && storageProvider === 'S3'}
                    />
                  </label>
                  <label>
                    Secret key
                    <input
                      type="password"
                      value={s3SecretKey}
                      onChange={(e) => setS3SecretKey(e.target.value)}
                      placeholder={
                        secretPlaceholder ? '•••••••• (unchanged if empty)' : 'Secret access key'
                      }
                      autoComplete="new-password"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <div className="settings-actions">
              <button
                type="submit"
                className="settings-primary-btn"
                disabled={saving || !hasLanguages}
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  )
}
