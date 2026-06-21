import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ErrorBoundary from './components/ErrorBoundary';

// Eager — primeiras páginas que o usuário vê
import Login from './pages/Login';
import StudentLogin from './pages/student/StudentLogin';
import Landing from './pages/Landing';
import InviteAccept from './pages/InviteAccept';

// Lazy — carregam sob demanda, reduz bundle inicial
const Register         = lazy(() => import('./pages/Register'));
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword    = lazy(() => import('./pages/ResetPassword'));
const PublicProfile    = lazy(() => import('./pages/PublicProfile'));
const Termos           = lazy(() => import('./pages/Termos'));
const Privacidade      = lazy(() => import('./pages/Privacidade'));
const OnboardingPersonal = lazy(() => import('./pages/OnboardingPersonal'));

const Dashboard          = lazy(() => import('./pages/dashboard/Dashboard'));
const Alunos             = lazy(() => import('./pages/dashboard/Alunos'));
const AlunoDetalhe       = lazy(() => import('./pages/dashboard/AlunoDetalhe'));
const Agenda             = lazy(() => import('./pages/dashboard/Agenda'));
const Treinos            = lazy(() => import('./pages/dashboard/Treinos'));
const Financeiro         = lazy(() => import('./pages/dashboard/Financeiro'));
const WhatsApp           = lazy(() => import('./pages/dashboard/WhatsApp'));
const Perfil             = lazy(() => import('./pages/dashboard/Perfil'));
const Frequencia         = lazy(() => import('./pages/dashboard/Frequencia'));
const Chat               = lazy(() => import('./pages/dashboard/Chat'));
const RelatorioAluno     = lazy(() => import('./pages/dashboard/RelatorioAluno'));
const AvaliacaoFisica    = lazy(() => import('./pages/dashboard/AvaliacaoFisica'));
const NutricaoPlanos     = lazy(() => import('./pages/dashboard/NutricaoPlanos'));
const NutricaoAlimentos  = lazy(() => import('./pages/dashboard/NutricaoAlimentos'));
const NutricaoPlanoAluno = lazy(() => import('./pages/dashboard/NutricaoPlanoAluno'));
const Cartilhas          = lazy(() => import('./pages/dashboard/Cartilhas'));
const Turmas             = lazy(() => import('./pages/dashboard/Turmas'));
const Configuracoes      = lazy(() => import('./pages/dashboard/Configuracoes'));

const OnboardingAluno  = lazy(() => import('./pages/student/OnboardingAluno'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const MeusTreinos      = lazy(() => import('./pages/student/MeusTreinos'));
const ExecutarTreino   = lazy(() => import('./pages/student/ExecutarTreino'));
const AgendaAluno      = lazy(() => import('./pages/student/AgendaAluno'));
const Progresso        = lazy(() => import('./pages/student/Progresso'));
const Historico        = lazy(() => import('./pages/student/Historico'));
const ChatAluno        = lazy(() => import('./pages/student/ChatAluno'));
const FotosProgresso   = lazy(() => import('./pages/student/FotosProgresso'));
const Anamnese         = lazy(() => import('./pages/student/Anamnese'));
const MeuPlanoAlimentar = lazy(() => import('./pages/student/MeuPlanoAlimentar'));
const LogAlimentar     = lazy(() => import('./pages/student/LogAlimentar'));
const Conquistas       = lazy(() => import('./pages/student/Conquistas'));
const Desafios         = lazy(() => import('./pages/student/Desafios'));
const MinhaAvaliacao   = lazy(() => import('./pages/student/MinhaAvaliacao'));

import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import StudentSidebar from './components/Layout/StudentSidebar';
import StudentBottomNav from './components/Layout/StudentBottomNav';
import PersonalBottomNav from './components/Layout/PersonalBottomNav';
import WaterToast from './components/UI/WaterToast';

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function PersonalRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'personal') return <Navigate to="/login" replace />;
  return (
    <SidebarProvider>
      <NotificationsProvider>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div className="layout-content">
            <Header />
            <main className="personal-main" style={{ flex: 1 }}>
              <Outlet />
            </main>
          </div>
          <PersonalBottomNav />
        </div>
      </NotificationsProvider>
    </SidebarProvider>
  );
}

function StudentRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'student') return <Navigate to="/aluno/login" replace />;
  return (
    <SidebarProvider>
      <NotificationsProvider>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <StudentSidebar />
          <div className="layout-content">
            <Header />
            <main className="student-main" style={{ flex: 1 }}>
              <Outlet />
            </main>
          </div>
          <StudentBottomNav />
          <WaterToast />
        </div>
      </NotificationsProvider>
    </SidebarProvider>
  );
}

function PersonalRouteClean() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'personal') return <Navigate to="/login" replace />;
  return <NotificationsProvider><Outlet /></NotificationsProvider>;
}

function StudentRouteClean() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'student') return <Navigate to="/aluno/login" replace />;
  return <NotificationsProvider><Outlet /></NotificationsProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/aluno/login" element={<StudentLogin />} />
              <Route path="/convite" element={<InviteAccept />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/esqueci-senha" element={<ForgotPassword />} />
              <Route path="/recuperar-senha" element={<ResetPassword />} />
              <Route path="/p/:slug" element={<PublicProfile />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/privacidade" element={<Privacidade />} />

              <Route element={<PersonalRoute />}>
                <Route path="/onboarding" element={<OnboardingPersonal />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/alunos" element={<Alunos />} />
                <Route path="/dashboard/agenda" element={<Agenda />} />
                <Route path="/dashboard/treinos" element={<Treinos />} />
                <Route path="/dashboard/financeiro" element={<Financeiro />} />
                <Route path="/dashboard/whatsapp" element={<WhatsApp />} />
                <Route path="/dashboard/perfil" element={<Perfil />} />
                <Route path="/dashboard/frequencia" element={<Frequencia />} />
                <Route path="/dashboard/chat" element={<Chat />} />
                <Route path="/dashboard/alunos/:id" element={<AlunoDetalhe />} />
                <Route path="/dashboard/alunos/:id/avaliacao" element={<AvaliacaoFisica />} />
                <Route path="/dashboard/alunos/:id/alimentacao" element={<Navigate to="../nutricao" replace />} />
                <Route path="/dashboard/alunos/:id/nutricao" element={<NutricaoPlanoAluno />} />
                <Route path="/dashboard/nutricao" element={<NutricaoPlanos />} />
                <Route path="/dashboard/nutricao/alimentos" element={<NutricaoAlimentos />} />
                <Route path="/dashboard/cartilhas" element={<Cartilhas />} />
                <Route path="/dashboard/turmas" element={<Turmas />} />
                <Route path="/dashboard/configuracoes" element={<Configuracoes />} />
              </Route>

              <Route element={<PersonalRouteClean />}>
                <Route path="/dashboard/alunos/:id/relatorio" element={<RelatorioAluno />} />
              </Route>

              <Route element={<StudentRoute />}>
                <Route path="/aluno/onboarding" element={<OnboardingAluno />} />
                <Route path="/aluno/dashboard" element={<StudentDashboard />} />
                <Route path="/aluno/treinos" element={<MeusTreinos />} />
                <Route path="/aluno/agenda" element={<AgendaAluno />} />
                <Route path="/aluno/progresso" element={<Progresso />} />
                <Route path="/aluno/historico" element={<Historico />} />
                <Route path="/aluno/chat" element={<ChatAluno />} />
                <Route path="/aluno/fotos" element={<FotosProgresso />} />
                <Route path="/aluno/saude" element={<Anamnese />} />
                <Route path="/aluno/alimentacao" element={<MeuPlanoAlimentar />} />
                <Route path="/aluno/log-alimentar" element={<LogAlimentar />} />
                <Route path="/aluno/conquistas" element={<Conquistas />} />
                <Route path="/aluno/desafios" element={<Desafios />} />
                <Route path="/aluno/avaliacao" element={<MinhaAvaliacao />} />
              </Route>

              <Route element={<StudentRouteClean />}>
                <Route path="/aluno/treinos/:planId/executar" element={<ExecutarTreino />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
