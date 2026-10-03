import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { getUser, isAdmin, updateStoredUser } from '../lib/auth'
import { confirmDialog } from '../lib/swal'
import {
  changeOwnPassword,
  changeUserRole,
  createUser,
  deleteUser,
  getMe,
  listUsers,
  setUserPassword,
  updateOwnProfile,
  updateUser,
  type ManagedUser,
} from '../lib/usersApi'
import './UsersPage.css'

type FormMode = 'create' | 'edit'

const EMPTY_FORM = {
  email: '',
  displayName: '',
  role: 'User' as 'Admin' | 'User',
  password: '',
  isActive: true,
}

export function UsersPage() {
  const sessionUser = getUser()
  const admin = isAdmin(sessionUser?.role)

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [me, setMe] = useState<ManagedUser | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [passwordOnly, setPasswordOnly] = useState('')
  const [ownCurrentPassword, setOwnCurrentPassword] = useState('')
  const [ownNewPassword, setOwnNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const mode: FormMode = editingId ? 'edit' : 'create'
  const editingUser = useMemo(
    () => users.find((u) => u.id === editingId) ?? null,
    [users, editingId],
  )

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const meResult = await getMe()
      setMe(meResult)
      updateStoredUser({
        id: meResult.id,
        email: meResult.email,
        displayName: meResult.displayName,
        role: meResult.role,
      })

      if (isAdmin(meResult.role)) {
        setUsers(await listUsers())
      } else {
        setUsers([meResult])
        setEditingId(meResult.id)
        setForm({
          email: meResult.email,
          displayName: meResult.displayName,
          role: meResult.role === 'Admin' ? 'Admin' : 'User',
          password: '',
          isActive: meResult.isActive,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  function resetForm() {
    if (!admin && me) {
      setEditingId(me.id)
      setForm({
        email: me.email,
        displayName: me.displayName,
        role: me.role === 'Admin' ? 'Admin' : 'User',
        password: '',
        isActive: me.isActive,
      })
    } else {
      setEditingId(null)
      setForm(EMPTY_FORM)
    }
    setPasswordOnly('')
    setOwnCurrentPassword('')
    setOwnNewPassword('')
  }

  function startEdit(user: ManagedUser) {
    setEditingId(user.id)
    setForm({
      email: user.email,
      displayName: user.displayName,
      role: user.role === 'Admin' ? 'Admin' : 'User',
      password: '',
      isActive: user.isActive,
    })
    setPasswordOnly('')
    setNotice(null)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'create') {
        if (!admin) throw new Error('Only admins can create users.')
        await createUser({
          email: form.email,
          displayName: form.displayName,
          password: form.password,
          role: form.role,
        })
        setNotice('User created.')
        resetForm()
      } else if (editingId) {
        const isSelf = me?.id === editingId
        if (isSelf) {
          const updated = await updateOwnProfile({
            email: form.email,
            displayName: form.displayName,
          })
          setMe(updated)
          updateStoredUser({
            email: updated.email,
            displayName: updated.displayName,
            role: updated.role,
          })
        } else if (admin) {
          await updateUser(editingId, {
            email: form.email,
            displayName: form.displayName,
            isActive: form.isActive,
          })
        } else {
          throw new Error('You can only edit your own profile.')
        }

        if (admin && editingUser && editingUser.role !== 'SuperAdmin' && !isSelf) {
          if (form.role !== editingUser.role) {
            await changeUserRole(editingId, form.role)
          }
        }

        if (passwordOnly.trim()) {
          if (isSelf) {
            if (!ownCurrentPassword.trim()) {
              throw new Error('Current password is required to change your password.')
            }
            await changeOwnPassword({
              currentPassword: ownCurrentPassword,
              newPassword: passwordOnly,
            })
          } else if (admin) {
            await setUserPassword(editingId, passwordOnly)
          }
        }

        setNotice('User saved.')
        if (admin) resetForm()
        else {
          setPasswordOnly('')
          setOwnCurrentPassword('')
          setOwnNewPassword('')
        }
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete user?',
      text: 'This user will be permanently removed.',
    })
    if (!confirmed) return
    setError(null)
    setNotice(null)
    try {
      await deleteUser(id)
      if (editingId === id) resetForm()
      setNotice('User deleted.')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.')
    }
  }

  const roleLocked = Boolean(editingUser && editingUser.role === 'SuperAdmin')
  const isEditingSelf = Boolean(me && editingId === me.id)

  return (
    <section className="users-page">
      <div className="users-heading">
        <h1>Users</h1>
        <p>
          {admin
            ? 'Manage admin and normal users, update profiles, passwords, and roles.'
            : 'Update your profile details and password.'}
        </p>
      </div>

      {error ? <p className="users-error">{error}</p> : null}
      {notice ? <p className="users-notice">{notice}</p> : null}

      <div className={`users-grid${admin ? '' : ' users-grid--single'}`}>
        <form className="users-form" onSubmit={handleSubmit}>
          <h2>
            {mode === 'create' ? 'Add user' : isEditingSelf ? 'My profile' : 'Edit user'}
          </h2>

          <label>
            Display name
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>

          {admin && (mode === 'create' || (!roleLocked && !isEditingSelf)) ? (
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as 'Admin' | 'User' }))
                }
              >
                <option value="User">Normal user</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
          ) : (
            <label>
              Role
              <input value={editingUser?.role ?? me?.role ?? form.role} disabled />
            </label>
          )}

          {admin && mode === 'edit' && !isEditingSelf ? (
            <label className="users-checkbox">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                disabled={roleLocked}
              />
              Active account
            </label>
          ) : null}

          {mode === 'create' ? (
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
                required
              />
            </label>
          ) : (
            <>
              {isEditingSelf ? (
                <label>
                  Current password
                  <input
                    type="password"
                    value={ownCurrentPassword}
                    onChange={(e) => setOwnCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Required only when changing password"
                  />
                </label>
              ) : null}
              <label>
                {isEditingSelf ? 'New password' : 'Reset password'}
                <input
                  type="password"
                  value={passwordOnly}
                  onChange={(e) => {
                    setPasswordOnly(e.target.value)
                    setOwnNewPassword(e.target.value)
                  }}
                  minLength={6}
                  autoComplete="new-password"
                  placeholder={ownNewPassword ? undefined : 'Leave blank to keep current'}
                />
              </label>
            </>
          )}

          <div className="users-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
            </button>
            {admin && mode === 'edit' ? (
              <button type="button" className="users-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        {admin ? (
          <div className="users-list">
            <h2>All users</h2>
            {loading ? <p className="users-muted">Loading…</p> : null}
            {!loading && users.length === 0 ? <p className="users-muted">No users yet.</p> : null}
            {!loading && users.length > 0 ? (
              <ul className="users-items">
                {users.map((user) => (
                  <li key={user.id}>
                    <div>
                      <strong>{user.displayName}</strong>
                      <span className="users-meta">{user.email}</span>
                      <div className="users-badges">
                        <span className={`users-badge users-badge--${user.role.toLowerCase()}`}>
                          {user.role === 'User' ? 'Normal user' : user.role}
                        </span>
                        <span
                          className={`users-badge ${user.isActive ? 'users-badge--active' : 'users-badge--inactive'}`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="users-row-actions">
                      <button type="button" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      {user.role !== 'SuperAdmin' && user.id !== me?.id ? (
                        <button
                          type="button"
                          className="users-delete"
                          onClick={() => handleDelete(user.id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
