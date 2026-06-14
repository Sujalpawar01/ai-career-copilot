/**
 * Match Analysis Page — Animated gauge + skill gap display.
 */
import { useState } from 'react'
import { documentAPI, analysisAPI } from '@/services/api'
import { BarChart3, Loader2, CheckCircle, XCircle, TrendingUp, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'

function ScoreGauge({ score }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-bg-elevated)" strokeWidth="10" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1.5s ease-in-out, stroke 0.5s' }} />
        <text x="60" y="55" textAnchor="middle" fill="var(--color-text-primary)" fontSize="22" fontWeight="800" fontFamily="var(--font-display)">{Math.round(score)}%</text>
        <text x="60" y="72" textAnchor="middle" fill="var(--color-text-muted)" fontSize="9">Match Score</text>
      </svg>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color }}>
        {score >= 75 ? '🎉 Strong Match' : score >= 50 ? '⚡ Moderate Match' : '📈 Needs Work'}
      </span>
    </div>
  )
}

export default function MatchAnalysisPage() {
  const [resumes, setResumes] = useState([])
  const [jobs, setJobs] = useState([])
  const [selectedResume, setSelectedResume] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  useState(() => {
    Promise.all([documentAPI.listResumes(), documentAPI.listJobDescriptions()])
      .then(([r, j]) => { setResumes(r.data); setJobs(j.data) })
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setDataLoaded(true))
  }, [])

  const handleAnalyze = async () => {
    if (!selectedResume || !selectedJob) {
      toast.error('Please select both a resume and a job description')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const { data } = await analysisAPI.matchAnalysis({ resume_id: selectedResume, job_description_id: selectedJob })
      setResult(data)
      toast.success('Analysis complete! 🎯')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="page-content animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊 Match Analysis</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Compare your resume against a job description for a detailed fit analysis.
        </p>
      </div>

      {/* Selector Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Select Documents</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Resume *
            </label>
            <select value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}>
              <option value="">— Select a resume —</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Job Description *
            </label>
            <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
              <option value="">— Select a job —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ''}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BarChart3 size={16} />}
          {loading ? 'Analyzing with AI...' : 'Run Match Analysis'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={48} color="var(--color-brand-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>AI is analyzing your resume against the job description...</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>This may take 10-20 seconds</p>
        </div>
      )}

      {result && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Score + Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <ScoreGauge score={result.match_score} />
            </div>
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Overall Assessment</h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{result.overall_assessment}</p>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {result.sources?.slice(0, 3).map((s, i) => (
                  <span key={i} className="badge badge-primary">📎 {s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Skills Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Matched Skills */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle size={18} color="var(--color-success)" />
                <h3 style={{ fontSize: '1rem' }}>Matched Skills ({result.matched_skills.length})</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {result.matched_skills.map((s) => (
                  <span key={s} className="badge badge-success">{s}</span>
                ))}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <XCircle size={18} color="var(--color-error)" />
                <h3 style={{ fontSize: '1rem' }}>Missing Skills ({result.missing_skills.length})</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.missing_skills.slice(0, 6).map((s) => (
                  <div key={s.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{s.skill}</span>
                    <span className={`badge ${s.importance === 'high' ? 'badge-error' : s.importance === 'medium' ? 'badge-warning' : 'badge-primary'}`}>{s.importance}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Lightbulb size={18} color="var(--color-warning)" />
              <h3 style={{ fontSize: '1rem' }}>Improvement Suggestions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {result.improvement_suggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--color-brand-primary)', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>0{i + 1}.</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
