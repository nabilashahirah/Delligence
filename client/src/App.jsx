import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PatientsPage from './pages/patients/PatientsPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import QueuePage from './pages/queue/QueuePage';
import NewPatientPage from './pages/patients/NewPatientPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import EditPatientPage from './pages/patients/EditPatientPage';
import NewAppointmentPage from './pages/appointments/NewAppointmentPage';
import CalendarPage from './pages/appointments/CalendarPage';
import NewTreatmentPage from './pages/treatments/NewTreatmentPage';
import MessagesPage from './pages/messages/MessagesPage';
import LandingPage from './pages/LandingPage';
import PortalLandingPage      from './pages/portal/PortalLandingPage';
import PortalBookPage         from './pages/portal/PortalBookPage';
import PortalConfirmationPage from './pages/portal/PortalConfirmationPage';
import PortalQueuePage        from './pages/portal/PortalQueuePage';
import PortalWalkInPage       from './pages/portal/PortalWalkInPage';
import AIChatWidget           from './components/AIChatWidget';
import useRealtimeSync        from './hooks/useRealtimeSync';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
});

function RealtimeSync() {
  useRealtimeSync();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* ── Landing page (public) ── */}
          <Route path="/" element={<LandingPage />} />

          {/* ── Public patient portal (no auth) ── */}
          <Route path="/portal"                          element={<PortalLandingPage />} />
          <Route path="/portal/book"                     element={<PortalBookPage />} />
          <Route path="/portal/confirmation/:id"         element={<PortalConfirmationPage />} />
          <Route path="/portal/queue"                    element={<PortalQueuePage />} />
          <Route path="/portal/walkin"                   element={<PortalWalkInPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard"    element={<DashboardPage />} />
            <Route path="patients"        element={<PatientsPage />} />
            <Route path="patients/new"    element={<NewPatientPage />} />
            <Route path="patients/:id"      element={<PatientDetailPage />} />
            <Route path="patients/:id/edit" element={<EditPatientPage />} />
            <Route path="appointments"     element={<AppointmentsPage />} />
            <Route path="appointments/new" element={<NewAppointmentPage />} />
            <Route path="calendar"         element={<CalendarPage />} />
            <Route path="queue"           element={<QueuePage />} />
            <Route path="treatments/new"  element={<NewTreatmentPage />} />
            <Route path="treatments/edit" element={<NewTreatmentPage />} />
            <Route path="messages"        element={<MessagesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <RealtimeSync />
      <Toaster position="top-right" />
      <AIChatWidget />
    </QueryClientProvider>
  );
}
