/**
 * Sidebar navigation component with all feature links.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, FileText, Briefcase, BarChart3, MessageSquare,
  Lightbulb, Mail, BookOpen, LogOut, Bot, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/resume', icon: FileText, label: 'My Resume' },
  { path: '/job', icon: Briefcase, label: 'Job Description' },
  { path: '/analyze', icon: BarChart3, label: 'Match Analysis' },
  { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { path: '/interview', icon: Lightbulb, label: 'Interview Prep' },
  { path: '/cover-letter', icon: BookOpen, label: 'Cover Letter' },
  { path: '/email', icon: Mail, label: 'Email Generator' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: '260px',
      minHeight: '100vh',
      background: 'var(--color-bg-secondary)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
              Career Copilot
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>
              Powered by GPT-4o
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '0.5rem', padding: '0 0.5rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Features
          </span>
        </div>
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = pathname === path
          return (
            <Link
              key={path}
              to={path}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-lg)',
                marginBottom: '2px', textDecoration: 'none',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                background: isActive
                  ? 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))'
                  : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--color-bg-hover)'
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {isActive && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem', borderRadius: 'var(--radius-lg)',
          background: 'var(--color-bg-card)', marginBottom: '0.5rem',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost w-full"
          style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', color: 'var(--color-error)', justifyContent: 'center', gap: '0.5rem' }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
