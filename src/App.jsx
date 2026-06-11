import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { NotificationsProvider } from './context/NotificationsContext';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import InviteAccept from './pages/InviteAccept';

import Dashboard from './pages/dashboard/Dashboard';
import Alunos from './pages/dashboard/Alunos';
import AlunoDetalhe from './pages/dashboard/AlunoDetalhe';
import Agenda from './pages/dashboard/Agenda';
import Treinos from './pages/dashboard/Treinos';
import Financeiro from './pages/dashboard/Financeiro';
import WhatsApp from './pages/dashboard/WhatsApp';
import Perfil from './pages/dashboard/Perfil';
import Frequencia from './pages/dashboard/Frequencia';
import Chat from './pages/dashboard/Chat';
import RelatorioAluno from './pages/dashboard/RelatorioAluno';
import AvaliacaoFisica from './pages/dashboard/AvaliacaoFisica';
import PlanoAlimentar from './pages/dashboard/PlanoAlimentar';

import PublicProfile from './pages/PublicProfile';
import Termos from './pages/Termos';
import Privacidade from './pages/Privacidade';

import StudentLogin from './pages/student/StudentLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import MeusTreinos from './pages/student/MeusTreinos';
import ExecutarTreino from './pages/student/ExecutarTreino';
import OnboardingAluno from './pages/student/OnboardingAluno';
import OnboardingPersonal from './pages/OnboardingPersonal';
import AgendaAluno from './pages/student/AgendaAluno';
import Progresso from './pages/student/Progresso';
import Historico from './pages/student/Historico';
import ChatAluno from './pages/student/ChatAluno';
import FotosProgresso from './pages/student/FotosProgresso';
import Anamnese from './pages/student/Anamnese';
import MeuPlanoAlimentar from './pages/student/MeuPlanoAlimentar';
import MinhaAvaliacao from './pages/student/MinhaAvaliacao';

import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import StudentSidebar from './components/Layout/StudentSidebar';
import StudentBottomNav from './components/Layout/StudentBottomNav';
import PersonalBottomNav from './components/Layout/PersonalBottomNav';
import WaterToast from './components/UI/WaterToast';

function PersonalRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!user || user.role !== 'personal') return <Navigate to="/login" replace />;
  return (
    <SidebarProvider>
      <NotificationsProvider>
        <div style={{ display: 'flex', background: '#F8FAFC', minHeight: '100vh' }}>
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
  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!user || user.role !== 'student') return <Navigate to="/aluno/login" replace />;
  return (
    <SidebarProvider>
      <NotificationsProvider>
        <div style={{ display: 'flex', background: '#F8FAFC', minHeight: '100vh' }}>
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

// Full-screen layout for print/report pages (no sidebar/bottom nav)
function PersonalRouteClean() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!user || user.role !== 'personal') return <Navigate to="/login" replace />;
  return (
    <NotificationsProvider>
      <Outlet />
    </NotificationsProvider>
  );
}

// Full-screen layout for workout execution (no sidebar/bottom nav)
function StudentRouteClean() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!user || user.role !== 'student') return <Navigate to="/aluno/login" replace />;
  return (
    <NotificationsProvider>
      <Outlet />
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/recuperar-senha" element={<ResetPassword />} />
          <Route path="/convite" element={<InviteAccept />} />
          <Route path="/aluno/login" element={<StudentLogin />} />
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
            <Route path="/dashboard/alunos/:id/alimentacao" element={<PlanoAlimentar />} />
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
            <Route path="/aluno/avaliacao" element={<MinhaAvaliacao />} />
          </Route>

          <Route element={<StudentRouteClean />}>
            <Route path="/aluno/treinos/:planId/executar" element={<ExecutarTreino />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
