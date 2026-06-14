/**
 * App Router — defines all routes with protected layout wrapping.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/hooks/useAuth'
import ProtectedLayout from '@/components/ProtectedLayout'

// Auth Pages
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

// App Pages
import DashboardPage from '@/pages/DashboardPage'
import ResumeUploadPage from '@/pages/ResumeUploadPage'
import JobDescriptionPage from '@/pages/JobDescriptionPage'
import MatchAnalysisPage from '@/pages/MatchAnalysisPage'
import ChatPage from '@/pages/ChatPage'
import InterviewPrepPage from '@/pages/InterviewPrepPage'
import CoverLetterPage from '@/pages/CoverLetterPage'
import EmailGeneratorPage from '@/pages/EmailGeneratorPage'

function ProtectedRoute({ children }) {
  return <ProtectedLayout>{children}</ProtectedLayout>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/resume" element={<ProtectedRoute><ResumeUploadPage /></ProtectedRoute>} />
          <Route path="/job" element={<ProtectedRoute><JobDescriptionPage /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute><MatchAnalysisPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewPrepPage /></ProtectedRoute>} />
          <Route path="/cover-letter" element={<ProtectedRoute><CoverLetterPage /></ProtectedRoute>} />
          <Route path="/email" element={<ProtectedRoute><EmailGeneratorPage /></ProtectedRoute>} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: 'var(--color-success)', secondary: 'var(--color-bg-elevated)' } },
          error: { iconTheme: { primary: 'var(--color-error)', secondary: 'var(--color-bg-elevated)' } },
        }}
      />
    </AuthProvider>
  )
}
