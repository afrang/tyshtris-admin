import { useEffect, useState } from 'react'
import { LocalizedFields } from '../LanguageTabs'
import type { Language, TextDirection } from '../../lib/languagesApi'
import { cloneQa, getQa, saveQa } from '../../lib/qaApi'
import './QaEditor.css'

type DraftAnswer = {
  key: string
  id?: string
  ordered: number
  publish: boolean
  answerText: string
}

type DraftQuestion = {
  key: string
  id?: string
  ordered: number
  publish: boolean
  questionText: string
  answers: DraftAnswer[]
  expanded: boolean
}

type Props = {
  component: string
  parentId: string
  lang: string
  direction?: TextDirection
  languages?: Language[]
}

function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyAnswer(ordered = 1): DraftAnswer {
  return {
    key: newKey(),
    ordered,
    publish: true,
    answerText: '',
  }
}

function emptyQuestion(ordered = 1): DraftQuestion {
  return {
    key: newKey(),
    ordered,
    publish: true,
    questionText: '',
    answers: [emptyAnswer(1)],
    expanded: true,
  }
}

export function QaEditor({ component, parentId, lang, direction = 'ltr', languages = [] }: Props) {
  const [questions, setQuestions] = useState<DraftQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cloneFrom, setCloneFrom] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const tree = await getQa(component, parentId, lang)
        if (cancelled) return
        setQuestions(
          tree.questions.map((q, qi) => ({
            key: q.id,
            id: q.id,
            ordered: q.ordered || qi + 1,
            publish: q.publish,
            questionText: q.questionText,
            expanded: true,
            answers: q.answers.map((a, ai) => ({
              key: a.id,
              id: a.id,
              ordered: a.ordered || ai + 1,
              publish: a.publish,
              answerText: a.answerText,
            })),
          })),
        )
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Q&A.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [component, parentId, lang])

  useEffect(() => {
    const other = languages.find((l) => l.prefix !== lang)
    setCloneFrom(other?.prefix ?? '')
  }, [languages, lang])

  function updateQuestion(key: string, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }

  function updateAnswer(questionKey: string, answerKey: string, patch: Partial<DraftAnswer>) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key !== questionKey
          ? q
          : {
              ...q,
              answers: q.answers.map((a) => (a.key === answerKey ? { ...a, ...patch } : a)),
            },
      ),
    )
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length + 1)])
  }

  function removeQuestion(key: string) {
    setQuestions((prev) => prev.filter((q) => q.key !== key))
  }

  function moveQuestion(key: string, directionDelta: -1 | 1) {
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.key === key)
      const next = index + directionDelta
      if (index < 0 || next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(next, 0, item)
      return copy.map((q, i) => ({ ...q, ordered: i + 1 }))
    })
  }

  function addAnswer(questionKey: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key !== questionKey
          ? q
          : { ...q, answers: [...q.answers, emptyAnswer(q.answers.length + 1)] },
      ),
    )
  }

  function removeAnswer(questionKey: string, answerKey: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key !== questionKey
          ? q
          : {
              ...q,
              answers:
                q.answers.length <= 1
                  ? q.answers
                  : q.answers.filter((a) => a.key !== answerKey).map((a, i) => ({ ...a, ordered: i + 1 })),
            },
      ),
    )
  }

  function moveAnswer(questionKey: string, answerKey: string, directionDelta: -1 | 1) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== questionKey) return q
        const index = q.answers.findIndex((a) => a.key === answerKey)
        const next = index + directionDelta
        if (index < 0 || next < 0 || next >= q.answers.length) return q
        const answers = [...q.answers]
        const [item] = answers.splice(index, 1)
        answers.splice(next, 0, item)
        return { ...q, answers: answers.map((a, i) => ({ ...a, ordered: i + 1 })) }
      }),
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      for (const q of questions) {
        if (!q.questionText.trim()) {
          throw new Error('Each question needs question text.')
        }
        if (q.answers.length === 0) {
          throw new Error('Each question needs at least one answer.')
        }
        for (const a of q.answers) {
          if (!a.answerText.trim()) {
            throw new Error('Each answer needs answer text.')
          }
        }
      }

      const tree = await saveQa(
        component,
        parentId,
        {
          questions: questions.map((q, qi) => ({
            id: q.id ?? null,
            ordered: qi + 1,
            publish: q.publish,
            questionText: q.questionText.trim(),
            answers: q.answers.map((a, ai) => ({
              id: a.id ?? null,
              ordered: ai + 1,
              publish: a.publish,
              answerText: a.answerText.trim(),
            })),
          })),
        },
        lang,
      )

      setQuestions(
        tree.questions.map((q, qi) => ({
          key: q.id,
          id: q.id,
          ordered: q.ordered || qi + 1,
          publish: q.publish,
          questionText: q.questionText,
          expanded: true,
          answers: q.answers.map((a, ai) => ({
            key: a.id,
            id: a.id,
            ordered: a.ordered || ai + 1,
            publish: a.publish,
            answerText: a.answerText,
          })),
        })),
      )
      setSuccess('Q&A saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Q&A.')
    } finally {
      setSaving(false)
    }
  }

  async function handleClone() {
    if (!cloneFrom || cloneFrom === lang) return
    setCloning(true)
    setError(null)
    setSuccess(null)
    try {
      const tree = await cloneQa(component, parentId, cloneFrom, lang)
      setQuestions(
        tree.questions.map((q, qi) => ({
          key: q.id,
          id: q.id,
          ordered: q.ordered || qi + 1,
          publish: q.publish,
          questionText: q.questionText,
          expanded: true,
          answers: q.answers.map((a, ai) => ({
            key: a.id,
            id: a.id,
            ordered: a.ordered || ai + 1,
            publish: a.publish,
            answerText: a.answerText,
          })),
        })),
      )
      setSuccess(`Copied Q&A text from ${cloneFrom.toUpperCase()}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone Q&A.')
    } finally {
      setCloning(false)
    }
  }

  if (loading) {
    return <div className="qa-editor-loading">Loading Q&A…</div>
  }

  const otherLanguages = languages.filter((l) => l.prefix !== lang)

  return (
    <div className="qa-editor">
      <div className="qa-editor-toolbar">
        <div>
          <h2>Q&A</h2>
          <p>
            Multiple questions with multiple answers for <code>{component}</code>. Editing language:{' '}
            <strong>{lang.toUpperCase()}</strong>
          </p>
        </div>
        <div className="qa-editor-toolbar-actions">
          {otherLanguages.length > 0 ? (
            <div className="qa-editor-clone">
              <select
                value={cloneFrom}
                onChange={(e) => setCloneFrom(e.target.value)}
                disabled={saving || cloning}
                aria-label="Clone from language"
              >
                {otherLanguages.map((l) => (
                  <option key={l.prefix} value={l.prefix}>
                    From {l.name} ({l.prefix})
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => void handleClone()} disabled={saving || cloning || !cloneFrom}>
                {cloning ? 'Copying…' : 'Copy texts'}
              </button>
            </div>
          ) : null}
          <button type="button" className="qa-editor-add" onClick={addQuestion} disabled={saving}>
            Add question
          </button>
          <button type="button" className="qa-editor-save" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Q&A'}
          </button>
        </div>
      </div>

      {error ? <p className="qa-editor-error">{error}</p> : null}
      {success ? <p className="qa-editor-success">{success}</p> : null}

      {questions.length === 0 ? (
        <div className="qa-editor-empty">
          <p>No questions yet. Add the first question for this item.</p>
          <button type="button" className="qa-editor-add" onClick={addQuestion}>
            Add question
          </button>
        </div>
      ) : (
        <LocalizedFields direction={direction}>
          <ul className="qa-question-list">
            {questions.map((question, qIndex) => (
              <li key={question.key} className="qa-question-card">
                <div className="qa-question-head">
                  <button
                    type="button"
                    className="qa-question-toggle"
                    onClick={() => updateQuestion(question.key, { expanded: !question.expanded })}
                    aria-expanded={question.expanded}
                  >
                    {question.expanded ? '▾' : '▸'} Question {qIndex + 1}
                  </button>
                  <div className="qa-question-controls">
                    <label className="qa-publish">
                      <input
                        type="checkbox"
                        checked={question.publish}
                        onChange={(e) => updateQuestion(question.key, { publish: e.target.checked })}
                      />
                      Publish
                    </label>
                    <button type="button" onClick={() => moveQuestion(question.key, -1)} disabled={qIndex === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(question.key, 1)}
                      disabled={qIndex === questions.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="qa-danger"
                      onClick={() => removeQuestion(question.key)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {question.expanded ? (
                  <div className="qa-question-body">
                    <label className="qa-field">
                      Question
                      <textarea
                        value={question.questionText}
                        onChange={(e) => updateQuestion(question.key, { questionText: e.target.value })}
                        rows={2}
                        placeholder="What is included?"
                      />
                    </label>

                    <div className="qa-answers-head">
                      <h3>Answers</h3>
                      <button type="button" onClick={() => addAnswer(question.key)}>
                        Add answer
                      </button>
                    </div>

                    <ul className="qa-answer-list">
                      {question.answers.map((answer, aIndex) => (
                        <li key={answer.key} className="qa-answer-card">
                          <div className="qa-answer-controls">
                            <span>Answer {aIndex + 1}</span>
                            <label className="qa-publish">
                              <input
                                type="checkbox"
                                checked={answer.publish}
                                onChange={(e) =>
                                  updateAnswer(question.key, answer.key, { publish: e.target.checked })
                                }
                              />
                              Publish
                            </label>
                            <button
                              type="button"
                              onClick={() => moveAnswer(question.key, answer.key, -1)}
                              disabled={aIndex === 0}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveAnswer(question.key, answer.key, 1)}
                              disabled={aIndex === question.answers.length - 1}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="qa-danger"
                              onClick={() => removeAnswer(question.key, answer.key)}
                              disabled={question.answers.length <= 1}
                            >
                              Remove
                            </button>
                          </div>
                          <label className="qa-field">
                            Answer text
                            <textarea
                              value={answer.answerText}
                              onChange={(e) =>
                                updateAnswer(question.key, answer.key, { answerText: e.target.value })
                              }
                              rows={3}
                              placeholder="Write the answer…"
                            />
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </LocalizedFields>
      )}
    </div>
  )
}
