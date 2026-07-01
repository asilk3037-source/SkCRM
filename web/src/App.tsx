import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { Companies } from './pages/Companies'
import { Deals } from './pages/Deals'
import { Tasks } from './pages/Tasks'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="contatos" element={<Contacts />} />
          <Route path="empresas" element={<Companies />} />
          <Route path="negociacoes" element={<Deals />} />
          <Route path="tarefas" element={<Tasks />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
