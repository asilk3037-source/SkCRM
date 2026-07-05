import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { OrgProvider } from './context/OrgContext'
import { ConfirmProvider } from './components/ConfirmDialog'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { PageLoading } from './components/ui/Spinner'

const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Contacts = lazy(() => import('./pages/Contacts').then((m) => ({ default: m.Contacts })))
const Companies = lazy(() => import('./pages/Companies').then((m) => ({ default: m.Companies })))
const CompanyDetail = lazy(() => import('./pages/CompanyDetail').then((m) => ({ default: m.CompanyDetail })))
const Deals = lazy(() => import('./pages/Deals').then((m) => ({ default: m.Deals })))
const Tasks = lazy(() => import('./pages/Tasks').then((m) => ({ default: m.Tasks })))
const Tickets = lazy(() => import('./pages/Tickets').then((m) => ({ default: m.Tickets })))
const TicketDetail = lazy(() => import('./pages/TicketDetail').then((m) => ({ default: m.TicketDetail })))
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })))
const Portal = lazy(() => import('./pages/Portal').then((m) => ({ default: m.Portal })))
const PortalTicket = lazy(() => import('./pages/PortalTicket').then((m) => ({ default: m.PortalTicket })))
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))
const TicketsTV = lazy(() => import('./pages/TicketsTV').then((m) => ({ default: m.TicketsTV })))

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/cadastro"
            element={
              <LazyPage>
                <Signup />
              </LazyPage>
            }
          />
          <Route
            path="/recuperar-senha"
            element={
              <LazyPage>
                <ForgotPassword />
              </LazyPage>
            }
          />
          <Route
            path="/redefinir-senha"
            element={
              <LazyPage>
                <ResetPassword />
              </LazyPage>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <LazyPage>
                  <Portal />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/:id"
            element={
              <ProtectedRoute>
                <LazyPage>
                  <PortalTicket />
                </LazyPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tv"
            element={
              <ProtectedRoute>
                <OrgProvider>
                  <LazyPage>
                    <TicketsTV />
                  </LazyPage>
                </OrgProvider>
              </ProtectedRoute>
            }
          />
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
            <Route
              index
              element={
                <LazyPage>
                  <Dashboard />
                </LazyPage>
              }
            />
            <Route
              path="contatos"
              element={
                <LazyPage>
                  <Contacts />
                </LazyPage>
              }
            />
            <Route
              path="empresas"
              element={
                <LazyPage>
                  <Companies />
                </LazyPage>
              }
            />
            <Route
              path="empresas/:id"
              element={
                <LazyPage>
                  <CompanyDetail />
                </LazyPage>
              }
            />
            <Route
              path="negociacoes"
              element={
                <LazyPage>
                  <Deals />
                </LazyPage>
              }
            />
            <Route
              path="chamados"
              element={
                <LazyPage>
                  <Tickets />
                </LazyPage>
              }
            />
            <Route
              path="chamados/:id"
              element={
                <LazyPage>
                  <TicketDetail />
                </LazyPage>
              }
            />
            <Route
              path="tarefas"
              element={
                <LazyPage>
                  <Tasks />
                </LazyPage>
              }
            />
            <Route
              path="relatorios"
              element={
                <LazyPage>
                  <Reports />
                </LazyPage>
              }
            />
            <Route
              path="equipe"
              element={
                <LazyPage>
                  <Team />
                </LazyPage>
              }
            />
          </Route>
        </Routes>
      </ConfirmProvider>
    </AuthProvider>
  )
}

export default App
