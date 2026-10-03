import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { UiLanguageProvider } from './i18n/UiLanguage'
import 'sweetalert2/dist/sweetalert2.min.css'
import './index.css'

// Disable browser auto-translate (Chrome/Edge) for the whole admin panel.
function enforceNoTranslate() {
  document.documentElement.setAttribute('translate', 'no')
  document.documentElement.classList.add('notranslate')
  document.body.setAttribute('translate', 'no')
  document.body.classList.add('notranslate')
}

enforceNoTranslate()

// Some browsers still translate newly-created inputs/contenteditables, so
// enforce translate="no" + spellcheck="false" on every editable element.
const editableObserver = new MutationObserver(() => {
  document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach((element) => {
    if (element.getAttribute('translate') !== 'no') {
      element.setAttribute('translate', 'no')
    }
    if (element.getAttribute('spellcheck') !== 'false') {
      element.setAttribute('spellcheck', 'false')
    }
  })
})

editableObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['contenteditable', 'translate'],
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UiLanguageProvider>
        <App />
      </UiLanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
