/**
 * Interview Prep Page — Generate Q&A at configurable difficulty levels.
 */
import { useState } from 'react'
import { documentAPI, interviewAPI } from '@/services/api'
import { Lightbulb, Loader2, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const DIFFICULTY_COLORS = { beginner: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' }

function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(false)
  const copy = () => { navigator.clipboard.writeText(`Q: ${q.question}\n\nA: ${q.model_answer || 'See tips.'}`); toast.success('Copied!') }

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-brand-primary)', flexShrink: 0, marginTop: '2px' }}>Q{index + 1}</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>{q.question}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="badge badge-primary">{q.type}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>• {q.difficulty}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); copy() }}><Copy size={14} /></button>
          {open ? <ChevronUp size={18} color="var(--color-text-muted)" /> : <ChevronDown size={18} color="var(--color-text-muted)" />}
        </div>
      </div>
      {open && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          {q.model_answer && (
            <div style={{ background: 'var(--color-bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Answer</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{q.model_answer}</p>
            </div>
          )}
          {q.tips?.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💡 Tips</p>
              {q.tips.map((t, i) => (
                <p key={i} style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>• {t}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function InterviewPrepPage() {
  const [resumes, setResumes] = useState([])
  const [jobs, setJobs] = useState([])
  const [config, setConfig] = useState({ resume_id: '', job_description_id: '', difficulty: 'intermediate', question_count: 10, include_answers: true })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('technical')

  useState(() => {
    Promise.all([documentAPI.listResumes(), documentAPI.listJobDescriptions()])
      .then(([r, j]) => { setResumes(r.data); setJobs(j.data) })
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!config.resume_id || !config.job_description_id) {
      toast.error('Select both a resume and job description')
      return
    }
    setLoading(true); setResult(null)
    try {
      const { data } = await interviewAPI.generate(config)
      setResult(data)
      toast.success(`Generated ${data.total_questions} questions! 🎯`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed')
    } finally { setLoading(false) }
  }

  const downloadAll = () => {
    if (!result) return
    const all = [...(result.technical_questions || []), ...(result.hr_questions || [])]
    const text = all.map((q, i) => `Q${i + 1}: ${q.question}\n\nAnswer: ${q.model_answer || 'N/A'}\n\n${'-'.repeat(60)}\n`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `interview-questions-${config.difficulty}.txt`; a.click()
    toast.success('Downloaded!')
  }

  return (
    <div className="page-content animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯 Interview Preparation</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Generate personalized interview questions with model answers at your target difficulty level.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Resume *</label>
            <select value={config.resume_id} onChange={(e) => setConfig({ ...config, resume_id: e.target.value })}>
              <option value="">— Select resume —</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Job Description *</label>
            <select value={config.job_description_id} onChange={(e) => setConfig({ ...config, job_description_id: e.target.value })}>
              <option value="">— Select job —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Difficulty Level</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {DIFFICULTIES.map((d) => (
              <button key={d} onClick={() => setConfig({ ...config, difficulty: d })}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.875rem',
                  border: `2px solid ${config.difficulty === d ? DIFFICULTY_COLORS[d] : 'var(--color-border)'}`,
                  background: config.difficulty === d ? `${DIFFICULTY_COLORS[d]}15` : 'transparent',
                  color: config.difficulty === d ? DIFFICULTY_COLORS[d] : 'var(--color-text-muted)',
                  transition: 'all var(--transition-fast)',
                }}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={config.include_answers} onChange={(e) => setConfig({ ...config, include_answers: e.target.checked })} />
            Include model answers
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Questions:</label>
            <input type="number" value={config.question_count} min={3} max={20} onChange={(e) => setConfig({ ...config, question_count: parseInt(e.target.value) })} style={{ width: '70px' }} />
          </div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lightbulb size={16} />}
            {loading ? 'Generating...' : 'Generate Questions'}
          </button>
        </div>
      </div>

      {result && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['technical', 'hr'].map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.875rem',
                    background: activeTab === t ? 'var(--color-brand-primary)' : 'var(--color-bg-card)',
                    color: activeTab === t ? 'white' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}>
                  {t === 'technical' ? `💻 Technical (${result.technical_questions?.length || 0})` : `🤝 HR/Behavioral (${result.hr_questions?.length || 0})`}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={downloadAll}><Download size={14} /> Download All</button>
          </div>

          {(activeTab === 'technical' ? result.technical_questions : result.hr_questions)?.map((q, i) => (
            <QuestionCard key={i} q={q} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
