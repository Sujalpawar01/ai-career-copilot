/**
 * Dashboard — Overview of all features with quick action cards.
 */
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  FileText, Briefcase, BarChart3, MessageSquare,
  Lightbulb, BookOpen, Mail, ArrowRight, Sparkles, Zap
} from 'lucide-react'

const FEATURE_CARDS = [
  {
    path: '/resume', icon: FileText, title: 'Upload Resume',
    description: 'Upload your PDF or DOCX resume for AI-powered analysis',
    color: '#6366f1', bg: 'rgba(99,102,241,0.08)',
  },
  {
    path: '/job', icon: Briefcase, title: 'Job Description',
    description: 'Paste or upload a job description to compare against your resume',
    color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',
  },
  {
    path: '/analyze', icon: BarChart3, title: 'Match Analysis',
    description: 'Get a skill match score, gap analysis, and improvement suggestions',
    color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',
  },
  {
    path: '/chat', icon: MessageSquare, title: 'AI Chat',
    description: 'Ask career questions grounded in your resume and JD context',
    color: '#10b981', bg: 'rgba(16,185,129,0.08)',
  },
  {
    path: '/interview', icon: Lightbulb, title: 'Interview Prep',
    description: 'Generate technical and HR questions at any difficulty level',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',
  },
  {
    path: '/cover-letter', icon: BookOpen, title: 'Cover Letter',
    description: 'Generate a personalized cover letter tailored to the role',
    color: '#ec4899', bg: 'rgba(236,72,153,0.08)',
  },
  {
    path: '/email', icon: Mail, title: 'Email Generator',
    description: 'Create cold emails, LinkedIn messages, and follow-ups',
    color: '#f97316', bg: 'rgba(249,115,22,0.08)',
  },
]

const STATS = [
  { label: 'AI Features', value: '7', icon: Sparkles },
  { label: 'Powered by', value: 'GPT-4o', icon: Zap },
  { label: 'RAG Pipeline', value: 'Active', icon: BarChart3 },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page-content animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>👋</span>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            {greeting}, <strong style={{ color: 'var(--color-text-primary)' }}>{user?.full_name || user?.username}</strong>
          </p>
        </div>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', lineHeight: 1.1 }}>
          Your AI Career Copilot
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.75rem', maxWidth: '520px' }}>
          Powered by GPT-4o + LangChain RAG. Upload your resume, add a job description, and let AI supercharge your job search.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {STATS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card" style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(99,102,241,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={20} color="var(--color-brand-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Start Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-xl)',
        padding: '1.5rem 2rem', marginBottom: '2.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem', fontSize: '1.1rem' }}>🚀 Get started in 3 steps</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Upload Resume → Add Job Description → Run Analysis
          </p>
        </div>
        <Link to="/resume" className="btn btn-primary" style={{ flexShrink: 0 }}>
          Upload Resume <ArrowRight size={16} />
        </Link>
      </div>

      {/* Feature Cards Grid */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
        All Features
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {FEATURE_CARDS.map(({ path, icon: Icon, title, description, color, bg }) => (
          <Link
            key={path}
            to={path}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all var(--transition-base)', height: '100%' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color + '40'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={22} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: '0.375rem' }}>{title}</h3>
                    <ArrowRight size={16} color="var(--color-text-muted)" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {description}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
