import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { OrgProvider } from './context/OrgContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { Companies } from './pages/Companies'
import { Deals } from './pages/Deals'
import { Tasks } from './pages/Tasks'
import { Tickets } from './pages/Tickets'
import { TicketDetail } from './pages/TicketDetail'
import { Team } from './pages/Team'

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
              <OrgProvider>
                <Layout />
              </OrgProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="contatos" element={<Contacts />} />
          <Route path="empresas" element={<Companies />} />
          <Route path="negociacoes" element={<Deals />} />
          <Route path="chamados" element={<Tickets />} />
          <Route path="chamados/:id" element={<TicketDetail />} />
          <Route path="tarefas" element={<Tasks />} />
          <Route path="equipe" element={<Team />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
