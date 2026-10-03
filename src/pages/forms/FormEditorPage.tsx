import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FORM_FIELD_TYPES,
  createForm,
  deleteFormSubmission,
  getForm,
  listFormSubmissions,
  syncFormFields,
  updateForm,
  type FormFieldType,
  type FormSubmission,
  type UpsertFormFieldInput,
} from '../../lib/formsApi'
import { EditorTryaBuilder } from '../../components/editor-trya/EditorTryaBuilder'
import { LanguageTabs, LocalizedFields } from '../../components/LanguageTabs'
import { useLanguages } from '../../hooks/useLanguages'
import { useAdminShell } from '../../layouts/AdminLayout'
import { confirmDialog } from '../../lib/swal'
import '../content/PostEditorPage.css'
import './FormBuilder.css'

type DraftField = {
  localId: string
  id?: string | null
  fieldKey: string
  fieldType: FormFieldType
  label: string
  placeholder: string
  helpText: string
  optionsText: string
  isRequired: boolean
}

type EditorTab = 'details' | 'builder' | 'editortrya' | 'preview' | 'submissions'

const FIELD_TYPE_META: Record<FormFieldType, { icon: string; hint: string }> = {
  text: { icon: 'T', hint: 'Short, single-line answer' },
  email: { icon: '@', hint: 'Validated email address' },
  tel: { icon: '☎', hint: 'Phone number' },
  number: { icon: '#', hint: 'Numeric value' },
  textarea: { icon: '¶', hint: 'Long, multi-line answer' },
  select: { icon: '⌄', hint: 'Dropdown with choices' },
  radio: { icon: '◉', hint: 'Choose one option' },
  checkbox: { icon: '✓', hint: 'Yes or no choice' },
  date: { icon: '▦', hint: 'Calendar date' },
  url: { icon: '↗', hint: 'Website address' },
}

function fieldTypeLabel(type: FormFieldType): string {
  return FORM_FIELD_TYPES.find((item) => item.value === type)?.label ?? type
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function keyify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^[^a-z]+/, '')
}

function newLocalId(): string {
  return `local-${crypto.randomUUID()}`
}

function needsOptions(type: FormFieldType): boolean {
  return type === 'select' || type === 'radio'
}

function toDraftFields(
  fields: {
    id: string
    fieldKey: string
    fieldType: FormFieldType
    label: string
    placeholder: string | null
    helpText: string | null
    options: string[]
    isRequired: boolean
  }[],
): DraftField[] {
  return fields.map((field) => ({
    localId: field.id,
    id: field.id,
    fieldKey: field.fieldKey,
    fieldType: field.fieldType,
    label: field.label,
    placeholder: field.placeholder ?? '',
    helpText: field.helpText ?? '',
    optionsText: (field.options ?? []).join('\n'),
    isRequired: field.isRequired,
  }))
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function formatPayload(payloadJson: string): string {
  try {
    return JSON.stringify(JSON.parse(payloadJson), null, 2)
  } catch {
    return payloadJson
  }
}

export function FormEditorPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const {
    languages,
    lang,
    setLang,
    direction,
    loading: langLoading,
    error: langError,
    hasLanguages,
  } = useLanguages()
  const { setSidebarOpen } = useAdminShell()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [submitButtonText, setSubmitButtonText] = useState('Submit')
  const [successMessage, setSuccessMessage] = useState('Thanks! Your response was submitted.')
  const [isPublished, setIsPublished] = useState(false)
  const [fields, setFields] = useState<DraftField[]>([])
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingFields, setSavingFields] = useState(false)
  const [fieldsDirty, setFieldsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<EditorTab>('details')
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})

  useEffect(() => {
    setSidebarOpen(activeTab !== 'editortrya')
    return () => setSidebarOpen(true)
  }, [activeTab, setSidebarOpen])

  const selectedField = useMemo(
    () => fields.find((field) => field.localId === selectedLocalId) ?? null,
    [fields, selectedLocalId],
  )

  useEffect(() => {
    if (!lang) {
      if (!langLoading) setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (id) {
          const form = await getForm(id, lang)
          setTitle(form.title)
          setSlug(form.slug)
          setDescription(form.description ?? '')
          setSubmitButtonText(form.submitButtonText || 'Submit')
          setSuccessMessage(form.successMessage ?? 'Thanks! Your response was submitted.')
          setIsPublished(form.isPublished)
          const drafted = toDraftFields(form.fields)
          setFields(drafted)
          setFieldsDirty(false)
          setSelectedLocalId(drafted[0]?.localId ?? null)
          setPreviewValues({})
          setSubmissions(await listFormSubmissions(id))
        } else {
          setLoading(false)
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, lang, langLoading])

  function updateField(localId: string, patch: Partial<DraftField>) {
    setFields((current) =>
      current.map((field) => (field.localId === localId ? { ...field, ...patch } : field)),
    )
    setFieldsDirty(true)
  }

  function addField(type: FormFieldType = 'text') {
    const index = fields.length + 1
    const draft: DraftField = {
      localId: newLocalId(),
      id: null,
      fieldKey: `field_${index}`,
      fieldType: type,
      label: `Field ${index}`,
      placeholder: '',
      helpText: '',
      optionsText: type === 'select' || type === 'radio' ? 'Option 1\nOption 2' : '',
      isRequired: false,
    }
    setFields((current) => [...current, draft])
    setFieldsDirty(true)
    setSelectedLocalId(draft.localId)
    setActiveTab('builder')
  }

  async function removeField(localId: string) {
    const confirmed = await confirmDialog({
      title: 'Remove field?',
      text: 'This field will be removed when you save the builder.',
    })
    if (!confirmed) return
    setFields((current) => {
      const next = current.filter((field) => field.localId !== localId)
      if (selectedLocalId === localId) {
        setSelectedLocalId(next[0]?.localId ?? null)
      }
      return next
    })
    setFieldsDirty(true)
  }

  function duplicateField(localId: string) {
    setFields((current) => {
      const index = current.findIndex((field) => field.localId === localId)
      if (index < 0) return current
      const source = current[index]
      const copy: DraftField = {
        ...source,
        localId: newLocalId(),
        id: null,
        label: `${source.label || 'Untitled field'} copy`,
        fieldKey: `${source.fieldKey || `field_${index + 1}`}_copy`,
      }
      const next = [...current]
      next.splice(index + 1, 0, copy)
      setSelectedLocalId(copy.localId)
      return next
    })
    setFieldsDirty(true)
  }

  function moveField(localId: string, direction: -1 | 1) {
    setFields((current) => {
      const index = current.findIndex((field) => field.localId === localId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
    setFieldsDirty(true)
  }

  function buildFieldPayload(): UpsertFormFieldInput[] {
    return fields.map((field, index) => ({
      id: field.id || null,
      fieldKey: field.fieldKey || keyify(field.label) || `field_${index + 1}`,
      fieldType: field.fieldType,
      label: field.label,
      placeholder: field.placeholder || null,
      helpText: field.helpText || null,
      options: needsOptions(field.fieldType)
        ? field.optionsText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : [],
      isRequired: field.isRequired,
      sortOrder: index + 1,
    }))
  }

  async function handleSubmitDetails(event: FormEvent) {
    event.preventDefault()
    if (!lang) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title,
        slug: slug || slugify(title),
        description: description || null,
        submitButtonText: submitButtonText || 'Submit',
        successMessage: successMessage || null,
        isPublished,
      }

      if (isEdit && id) {
        await updateForm(id, payload, lang)
        navigate('/forms')
      } else {
        const created = await createForm(payload, lang)
        navigate(`/forms/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveFields() {
    if (!lang || !id) return
    setSavingFields(true)
    setError(null)
    try {
      const updated = await syncFormFields(id, buildFieldPayload(), lang)
      const drafted = toDraftFields(updated.fields)
      setFields(drafted)
      setFieldsDirty(false)
      setSelectedLocalId((current) =>
        drafted.some((field) => field.localId === current) ? current : drafted[0]?.localId ?? null,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fields.')
    } finally {
      setSavingFields(false)
    }
  }

  async function handleDeleteSubmission(submissionId: string) {
    if (!id) return
    const confirmed = await confirmDialog({
      title: 'Delete submission?',
      text: 'This response will be permanently removed.',
    })
    if (!confirmed) return
    try {
      await deleteFormSubmission(id, submissionId)
      setSubmissions((current) => current.filter((item) => item.id !== submissionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete submission.')
    }
  }

  if (langLoading || (lang && loading && isEdit)) {
    return (
      <section className="post-editor">
        <div className="post-editor-loading">Loading editor…</div>
      </section>
    )
  }

  return (
    <section className="post-editor form-builder">
      <div className="post-editor-heading">
        <div>
          <p className="post-editor-kicker">Forms</p>
          <h1>{isEdit ? 'Edit form' : 'Add form'}</h1>
          <p>Configure form details, then build fields and review submissions.</p>
        </div>
        <div className="post-editor-heading-actions">
          <Link to="/forms" className="post-editor-back">
            Back to list
          </Link>
          {activeTab === 'details' ? (
            <button
              type="submit"
              form="form-details-editor"
              className="post-editor-save-top"
              disabled={saving || !hasLanguages}
            >
              {saving ? 'Saving…' : isEdit ? 'Save details' : 'Create form'}
            </button>
          ) : null}
          {activeTab === 'builder' && id ? (
            <button
              type="button"
              className="post-editor-save-top"
              disabled={savingFields || !hasLanguages}
              onClick={() => void handleSaveFields()}
            >
              {savingFields ? 'Saving…' : fieldsDirty ? 'Save field changes' : 'Fields saved'}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="post-editor-error">{error}</p> : null}

      <LanguageTabs
        languages={languages}
        value={lang}
        onChange={setLang}
        loading={langLoading}
        error={langError}
        disabled={saving || savingFields}
        direction={direction}
      />

      <div className="form-builder-editor-nav">
        <div className="post-editor-tabs form-builder-primary-tabs" role="tablist" aria-label="Form editing steps">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'details'}
            className={`post-editor-tab${activeTab === 'details' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <span className="form-builder-tab-step">1</span>
            Details &amp; Publish
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'builder'}
            className={`post-editor-tab${activeTab === 'builder' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('builder')}
            disabled={!id}
          >
            <span className="form-builder-tab-step">2</span>
            Form Editor{fieldsDirty ? ' •' : ''}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'editortrya'}
            className={`post-editor-tab${activeTab === 'editortrya' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('editortrya')}
            disabled={!id}
          >
            <span className="form-builder-tab-step">3</span>
            EditorTrya
          </button>
        </div>

        {id ? (
          <div className="form-builder-utility-tabs" role="tablist" aria-label="Form tools">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'editortrya'}
              className={activeTab === 'editortrya' ? 'is-active' : ''}
              onClick={() => setActiveTab('editortrya')}
            >
              EditorTrya
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preview'}
              className={activeTab === 'preview' ? 'is-active' : ''}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'submissions'}
              className={activeTab === 'submissions' ? 'is-active' : ''}
              onClick={() => setActiveTab('submissions')}
            >
              Submissions <span>{submissions.length}</span>
            </button>
          </div>
        ) : null}
      </div>

      <form
        id="form-details-editor"
        className={`post-editor-form${activeTab !== 'details' ? ' post-editor-form--full' : ''}`}
        onSubmit={handleSubmitDetails}
        hidden={activeTab !== 'details'}
      >
        <div className="post-editor-tab-panel">
          <div className="post-editor-main">
            <div className="post-editor-card">
              <div className="post-editor-card-head">
                <h2>Details</h2>
              </div>

              <LocalizedFields direction={direction}>
                <div className="post-editor-field-grid">
                  <label className="post-editor-field post-editor-field--wide">
                    Title
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        if (!isEdit && (!slug || slug === slugify(title))) {
                          setSlug(slugify(e.target.value))
                        }
                      }}
                      required
                      placeholder="Contact us"
                    />
                  </label>

                  <label className="post-editor-field">
                    Slug
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                      placeholder="contact-us"
                    />
                  </label>

                  <label className="post-editor-field post-editor-field--wide">
                    Description
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Short intro shown above the form."
                    />
                  </label>

                  <label className="post-editor-field">
                    Submit button
                    <input
                      value={submitButtonText}
                      onChange={(e) => setSubmitButtonText(e.target.value)}
                      placeholder="Submit"
                    />
                  </label>

                  <label className="post-editor-field post-editor-field--wide">
                    Success message
                    <input
                      value={successMessage}
                      onChange={(e) => setSuccessMessage(e.target.value)}
                      placeholder="Thanks! Your response was submitted."
                    />
                  </label>
                </div>
              </LocalizedFields>
            </div>
          </div>

          <aside className="post-editor-side">
            <div className="post-editor-card">
              <div className="post-editor-card-head">
                <h2>Publish</h2>
              </div>
              <label className="form-builder-check">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Published (available on public API)
              </label>
              <button type="submit" className="post-editor-save" disabled={saving || !hasLanguages}>
                {saving ? 'Saving…' : isEdit ? 'Update form' : 'Create form'}
              </button>
              {!isEdit ? (
                <p className="post-editor-muted">Create the form first, then open the builder tab.</p>
              ) : null}
            </div>
          </aside>
        </div>
      </form>

      <div className="form-builder-panel" hidden={activeTab !== 'builder'}>
        {!id ? (
          <div className="post-editor-card">
            <p className="post-editor-muted">Create the form first, then add fields in the builder.</p>
          </div>
        ) : (
          <div className="form-builder-layout">
            <aside className="form-builder-palette post-editor-card">
              <div className="post-editor-card-head">
                <div>
                  <p className="form-builder-eyebrow">Toolbox</p>
                  <h2>Add a field</h2>
                </div>
              </div>
              <p className="form-builder-section-copy">Choose a field type to add it to the bottom of your form.</p>
              <div className="form-builder-palette-grid">
                {FORM_FIELD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className="form-builder-palette-btn"
                    onClick={() => addField(type.value)}
                  >
                    <span className="form-builder-type-icon" aria-hidden="true">
                      {FIELD_TYPE_META[type.value].icon}
                    </span>
                    <span>
                      <strong>{type.label}</strong>
                      <small>{FIELD_TYPE_META[type.value].hint}</small>
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="form-builder-canvas post-editor-card">
              <div className="post-editor-card-head">
                <div>
                  <p className="form-builder-eyebrow">Form structure</p>
                  <h2>{fields.length} {fields.length === 1 ? 'field' : 'fields'}</h2>
                </div>
                <button
                  type="button"
                  className="form-builder-ghost-btn"
                  disabled={savingFields}
                  onClick={() => void handleSaveFields()}
                >
                  {savingFields ? 'Saving…' : fieldsDirty ? 'Save changes' : 'Saved'}
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="form-builder-empty">
                  <span aria-hidden="true">＋</span>
                  <strong>Your form is empty</strong>
                  <p>Choose a field from the toolbox to start building.</p>
                  <button type="button" onClick={() => addField('text')}>Add a text field</button>
                </div>
              ) : (
                <ul className="form-builder-field-list">
                  {fields.map((field, index) => (
                    <li key={field.localId}>
                      <button
                        type="button"
                        className={`form-builder-field-card${
                          selectedLocalId === field.localId ? ' is-selected' : ''
                        }`}
                        onClick={() => setSelectedLocalId(field.localId)}
                      >
                        <div className="form-builder-field-card-top">
                          <span className="form-builder-field-number">{index + 1}</span>
                          <strong>{field.label || 'Untitled field'}</strong>
                          <span className="form-builder-chip">{fieldTypeLabel(field.fieldType)}</span>
                          {field.isRequired ? <span className="form-builder-chip form-builder-chip--warn">Required</span> : null}
                        </div>
                        <code>{field.fieldKey || '—'}</code>
                      </button>
                      <div className="form-builder-field-tools">
                        <button type="button" aria-label={`Move ${field.label} up`} title="Move up" disabled={index === 0} onClick={() => moveField(field.localId, -1)}>
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === fields.length - 1}
                          aria-label={`Move ${field.label} down`}
                          title="Move down"
                          onClick={() => moveField(field.localId, 1)}
                        >
                          ↓
                        </button>
                        <button type="button" title="Duplicate" onClick={() => duplicateField(field.localId)}>
                          Copy
                        </button>
                        <button type="button" className="is-danger" onClick={() => void removeField(field.localId)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <aside className="form-builder-inspector post-editor-card">
              <div className="post-editor-card-head">
                <div>
                  <p className="form-builder-eyebrow">Inspector</p>
                  <h2>{selectedField ? 'Field settings' : 'Nothing selected'}</h2>
                </div>
              </div>
              {!selectedField ? (
                <p className="post-editor-muted">Select a field to edit its settings.</p>
              ) : (
                <div className="form-builder-inspector-fields" dir={direction}>
                  <label>
                    Label
                    <input
                      value={selectedField.label}
                      onChange={(e) => {
                        const nextLabel = e.target.value
                        const patch: Partial<DraftField> = { label: nextLabel }
                        if (
                          !selectedField.id &&
                          (!selectedField.fieldKey ||
                            selectedField.fieldKey === keyify(selectedField.label))
                        ) {
                          patch.fieldKey = keyify(nextLabel) || selectedField.fieldKey
                        }
                        updateField(selectedField.localId, patch)
                      }}
                    />
                    <small>Shown to people filling out the form.</small>
                  </label>
                  <label>
                    Key
                    <input
                      value={selectedField.fieldKey}
                      onChange={(e) => updateField(selectedField.localId, { fieldKey: e.target.value })}
                    />
                    <small>Used in submission data. Use letters, numbers, and underscores.</small>
                  </label>
                  <label>
                    Type
                    <select
                      value={selectedField.fieldType}
                      onChange={(e) =>
                        updateField(selectedField.localId, {
                          fieldType: e.target.value as FormFieldType,
                        })
                      }
                    >
                      {FORM_FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Placeholder
                    <input
                      value={selectedField.placeholder}
                      onChange={(e) =>
                        updateField(selectedField.localId, { placeholder: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Help text
                    <input
                      value={selectedField.helpText}
                      onChange={(e) =>
                        updateField(selectedField.localId, { helpText: e.target.value })
                      }
                    />
                  </label>
                  {needsOptions(selectedField.fieldType) ? (
                    <label>
                      Options (one per line)
                      <textarea
                        rows={5}
                        value={selectedField.optionsText}
                        onChange={(e) =>
                          updateField(selectedField.localId, { optionsText: e.target.value })
                        }
                      />
                    </label>
                  ) : null}
                  <label className="form-builder-check">
                    <input
                      type="checkbox"
                      checked={selectedField.isRequired}
                      onChange={(e) =>
                        updateField(selectedField.localId, { isRequired: e.target.checked })
                      }
                    />
                    Required
                  </label>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      <div className="form-builder-panel" hidden={activeTab !== 'editortrya'}>
        <div className="post-editor-card post-editor-card--editortrya">
          {id && lang ? (
            <EditorTryaBuilder
              key={`${id}-${lang}`}
              component="form"
              parentId={id}
              lang={lang}
              onLangChange={setLang}
              direction={direction}
              languages={languages}
              langLoading={langLoading}
              langError={langError}
            />
          ) : (
            <p className="post-editor-muted">
              {id
                ? 'Select a language to edit EditorTrya content.'
                : 'Create the form first, then build structured content with EditorTrya.'}
            </p>
          )}
        </div>
      </div>

      <div className="form-builder-panel" hidden={activeTab !== 'preview'}>
        <div className="form-builder-preview-shell">
        <div className="post-editor-card form-builder-preview" dir={direction}>
          <div className="post-editor-card-head">
            <div>
              <p className="form-builder-eyebrow">Live preview</p>
              <h2>{title || 'Untitled form'}</h2>
            </div>
            <span>{isPublished ? 'Published' : 'Draft'}</span>
          </div>
          {description ? <p className="form-builder-preview-desc">{description}</p> : null}
          {fields.length === 0 ? (
            <p className="post-editor-muted">Add fields in the builder to preview the form.</p>
          ) : (
            <div className="form-builder-preview-fields">
              {fields.map((field) => {
                const options = field.optionsText
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                const value = previewValues[field.localId] ?? ''

                return (
                  <label key={field.localId} className="form-builder-preview-field">
                    <span>
                      {field.label}
                      {field.isRequired ? ' *' : ''}
                    </span>
                    {field.fieldType === 'textarea' ? (
                      <textarea
                        rows={3}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) =>
                          setPreviewValues((current) => ({
                            ...current,
                            [field.localId]: e.target.value,
                          }))
                        }
                      />
                    ) : field.fieldType === 'select' ? (
                      <select
                        value={value}
                        onChange={(e) =>
                          setPreviewValues((current) => ({
                            ...current,
                            [field.localId]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select…</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.fieldType === 'radio' ? (
                      <div className="form-builder-preview-options">
                        {options.map((option) => (
                          <label key={option} className="form-builder-check">
                            <input
                              type="radio"
                              name={field.localId}
                              checked={value === option}
                              onChange={() =>
                                setPreviewValues((current) => ({
                                  ...current,
                                  [field.localId]: option,
                                }))
                              }
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : field.fieldType === 'checkbox' ? (
                      <label className="form-builder-check">
                        <input
                          type="checkbox"
                          checked={value === 'true'}
                          onChange={(e) =>
                            setPreviewValues((current) => ({
                              ...current,
                              [field.localId]: e.target.checked ? 'true' : '',
                            }))
                          }
                        />
                        {field.placeholder || field.label}
                      </label>
                    ) : (
                      <input
                        type={field.fieldType}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) =>
                          setPreviewValues((current) => ({
                            ...current,
                            [field.localId]: e.target.value,
                          }))
                        }
                      />
                    )}
                    {field.helpText ? <small>{field.helpText}</small> : null}
                  </label>
                )
              })}
              <button type="button" className="post-editor-save" disabled>
                {submitButtonText || 'Submit'}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="form-builder-panel" hidden={activeTab !== 'submissions'}>
        <div className="post-editor-card">
          <div className="post-editor-card-head">
            <h2>Submissions</h2>
          </div>
          {submissions.length === 0 ? (
            <p className="post-editor-muted">No submissions yet.</p>
          ) : (
            <div className="form-builder-submissions">
              {submissions.map((submission) => (
                <article key={submission.id} className="form-builder-submission">
                  <div className="form-builder-submission-head">
                    <div>
                      <strong>{formatDate(submission.createdAt)}</strong>
                      <span>
                        {submission.languagePrefix ? ` · ${submission.languagePrefix}` : ''}
                        {submission.ipAddress ? ` · ${submission.ipAddress}` : ''}
                      </span>
                    </div>
                    <button type="button" onClick={() => void handleDeleteSubmission(submission.id)}>
                      Delete
                    </button>
                  </div>
                  <pre>{formatPayload(submission.payloadJson)}</pre>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
