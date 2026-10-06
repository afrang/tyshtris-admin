import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { localizeDocument } from './documentTranslations'

export type UiLocale = 'en' | 'fa'

const messages = {
  en: {
    dashboard: 'Dashboard',
    content: 'Content',
    blogGroups: 'Blog Groups',
    posts: 'Posts',
    comments: 'Comments',
    tags: 'Tags',
    media: 'Media',
    galleries: 'Galleries',
    forms: 'Forms',
    requests: 'Requests',
    menuManager: 'Menu Manager',
    users: 'Users',
    settings: 'Settings',
    website: 'Website',
    languages: 'Languages',
    admin: 'Admin',
    normalUser: 'Normal user',
    search: 'Search the control center',
    signOut: 'Sign out',
    toggleSidebar: 'Toggle sidebar',
    interfaceLanguage: 'Interface language',
    controlCenter: 'Tishtrya Control Center',
    tagline: 'Command the constellation of your content.',
    email: 'Email',
    password: 'Password',
    signingIn: 'Signing in…',
    enterControlCenter: 'Enter Control Center',
    signInFailed: 'Sign-in failed.',
    captchaRequired: 'Please complete the captcha challenge.',
    captchaLoadFailed:
      'Captcha failed to load. Allow this domain in Cloudflare Turnstile, then retry.',
    captchaRetry: 'Retry captcha',
  },
  fa: {
    dashboard: 'داشبورد',
    content: 'محتوا',
    blogGroups: 'گروه‌های وبلاگ',
    posts: 'نوشته‌ها',
    comments: 'دیدگاه‌ها',
    tags: 'برچسب‌ها',
    media: 'رسانه',
    galleries: 'گالری‌ها',
    forms: 'فرم‌ها',
    requests: 'درخواست‌ها',
    menuManager: 'مدیریت منو',
    users: 'کاربران',
    settings: 'تنظیمات',
    website: 'وب‌سایت',
    languages: 'زبان‌ها',
    admin: 'مدیر',
    normalUser: 'کاربر عادی',
    search: 'جستجو در مرکز کنترل',
    signOut: 'خروج',
    toggleSidebar: 'باز و بسته کردن نوار کناری',
    interfaceLanguage: 'زبان رابط کاربری',
    controlCenter: 'مرکز کنترل تیشتریا',
    tagline: 'محتوای خود را یکپارچه مدیریت کنید.',
    email: 'ایمیل',
    password: 'رمز عبور',
    signingIn: 'در حال ورود…',
    enterControlCenter: 'ورود به مرکز کنترل',
    signInFailed: 'ورود ناموفق بود.',
    captchaRequired: 'لطفاً چالش امنیتی را تکمیل کنید.',
    captchaLoadFailed:
      'بارگذاری کپچا ناموفق بود. این دامنه را در Cloudflare Turnstile مجاز کنید و دوباره تلاش کنید.',
    captchaRetry: 'تلاش دوباره کپچا',
  },
} as const

export type UiMessageKey = keyof typeof messages.en

type UiLanguageContextValue = {
  locale: UiLocale
  direction: 'ltr' | 'rtl'
  setLocale: (locale: UiLocale) => void
  t: (key: UiMessageKey) => string
}

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null)
const STORAGE_KEY = 'tishtrya-ui-language'

function initialLocale(): UiLocale {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'fa' ? 'fa' : 'en'
}

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(initialLocale)
  const direction = locale === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
    document.documentElement.dir = direction
    return localizeDocument(locale)
  }, [locale, direction])

  const value = useMemo<UiLanguageContextValue>(
    () => ({
      locale,
      direction,
      setLocale: setLocaleState,
      t: (key) => messages[locale][key],
    }),
    [locale, direction],
  )

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>
}

export function useUiLanguage(): UiLanguageContextValue {
  const context = useContext(UiLanguageContext)
  if (!context) throw new Error('useUiLanguage must be used inside UiLanguageProvider.')
  return context
}

export function UiLanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useUiLanguage()

  return (
    <div className={`ui-language-switch${compact ? ' ui-language-switch--compact' : ''}`} aria-label={t('interfaceLanguage')}>
      <button type="button" className={locale === 'en' ? 'is-active' : ''} onClick={() => setLocale('en')} aria-pressed={locale === 'en'}>
        EN
      </button>
      <button type="button" className={locale === 'fa' ? 'is-active' : ''} onClick={() => setLocale('fa')} aria-pressed={locale === 'fa'}>
        فارسی
      </button>
    </div>
  )
}
