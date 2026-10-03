import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { BlogGroupsPage } from './pages/content/BlogGroupsPage'
import { BlogGroupEditorPage } from './pages/content/BlogGroupEditorPage'
import { PostsPage } from './pages/content/PostsPage'
import { PostEditorPage } from './pages/content/PostEditorPage'
import { TagsPage } from './pages/content/TagsPage'
import { CommentsPage } from './pages/content/CommentsPage'
import { GalleriesPage } from './pages/media/GalleriesPage'
import { GalleryEditorPage } from './pages/media/GalleryEditorPage'
import { FormsPage } from './pages/forms/FormsPage'
import { FormEditorPage } from './pages/forms/FormEditorPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { LanguagesPage } from './pages/settings/LanguagesPage'
import { MenuGroupsPage } from './pages/menus/MenuGroupsPage'
import { MenuGroupEditorPage } from './pages/menus/MenuGroupEditorPage'
import { MenuItemEditorPage } from './pages/menus/MenuItemEditorPage'
import { TicketsPage } from './pages/tickets/TicketsPage'
import { isAuthenticated } from './lib/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="content">
          <Route index element={<Navigate to="blog-groups" replace />} />
          <Route path="blog-groups" element={<BlogGroupsPage />} />
          <Route path="blog-groups/new" element={<BlogGroupEditorPage />} />
          <Route path="blog-groups/:id" element={<BlogGroupEditorPage />} />
          <Route path="posts" element={<PostsPage />} />
          <Route path="posts/new" element={<PostEditorPage />} />
          <Route path="posts/:id" element={<PostEditorPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="comments" element={<CommentsPage />} />
        </Route>
        <Route path="media">
          <Route index element={<Navigate to="galleries" replace />} />
          <Route path="galleries" element={<GalleriesPage />} />
          <Route path="galleries/new" element={<GalleryEditorPage />} />
          <Route path="galleries/:id" element={<GalleryEditorPage />} />
        </Route>
        <Route path="requests" element={<TicketsPage />} />
        <Route path="forms">
          <Route index element={<FormsPage />} />
          <Route path="new" element={<FormEditorPage />} />
          <Route path=":id" element={<FormEditorPage />} />
        </Route>
        <Route path="menus">
          <Route index element={<MenuGroupsPage />} />
          <Route path="new" element={<MenuGroupEditorPage />} />
          <Route path=":groupId" element={<MenuGroupEditorPage />} />
          <Route path=":groupId/items/new" element={<MenuItemEditorPage />} />
          <Route path=":groupId/items/:itemId" element={<MenuItemEditorPage />} />
        </Route>
        <Route path="users" element={<UsersPage />} />
        <Route path="settings">
          <Route index element={<Navigate to="website" replace />} />
          <Route path="website" element={<SettingsPage />} />
          <Route path="languages" element={<LanguagesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
