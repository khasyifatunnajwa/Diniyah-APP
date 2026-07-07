import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SetupWizard from './pages/SetupWizard'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import SantriPage from './pages/SantriPage'
import AbsensiPage from './pages/AbsensiPage'
import NilaiPage from './pages/NilaiPage'
import JadwalPage from './pages/JadwalPage'
import FinancePage from './pages/FinancePage'
import AsramaPage from './pages/AsramaPage'
import TahfidzPage from './pages/TahfidzPage'
import PerizinanPage from './pages/PerizinanPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import InventarisPage from './pages/InventarisPage'
import SuratPage from './pages/SuratPage'
import GuruPage from './pages/GuruPage'
import SettingsPage from './pages/SettingsPage'
import MarketplacePage from './pages/MarketplacePage'
import ModuleBuilderPage from './pages/ModuleBuilderPage'
import StudioPage from './pages/StudioPage'
import ThemeStorePage from './pages/ThemeStorePage'
import RaporPage from './pages/RaporPage'
import AgendaPage from './pages/AgendaPage'
import CustomModulePage from './pages/CustomModulePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/setup" replace />
  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-neutral-500">Memuat...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/" element={!session ? <LandingPage /> : <Navigate to={profile ? '/app/dashboard' : '/setup'} replace />} />
      <Route path="/login" element={!session ? <LoginPage /> : <Navigate to={profile ? '/app/dashboard' : '/setup'} replace />} />
      <Route path="/signup" element={!session ? <SignupPage /> : <Navigate to={profile ? '/app/dashboard' : '/setup'} replace />} />
      <Route path="/setup" element={session ? <SetupWizard /> : <Navigate to="/login" replace />} />
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="santri" element={<SantriPage />} />
        <Route path="absensi" element={<AbsensiPage />} />
        <Route path="nilai" element={<NilaiPage />} />
        <Route path="jadwal" element={<JadwalPage />} />
        <Route path="rapor" element={<RaporPage />} />
        <Route path="guru" element={<GuruPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="asrama" element={<AsramaPage />} />
        <Route path="tahfidz" element={<TahfidzPage />} />
        <Route path="perizinan" element={<PerizinanPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="inventaris" element={<InventarisPage />} />
        <Route path="surat" element={<SuratPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="module-builder" element={<ModuleBuilderPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="theme-store" element={<ThemeStorePage />} />
        <Route path="custom/:slug" element={<CustomModulePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
