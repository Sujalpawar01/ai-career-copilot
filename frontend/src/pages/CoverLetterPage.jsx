/**
 * Cover Letter Page — Generate and edit personalized cover letters.
 */
import { useState } from 'react'
import { documentAPI, coverLetterAPI } from '@/services/api'
import { BookOpen, Loader2, Copy, Download, Edit2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const TONES = [
  { value: 'professional', label: '💼 Professional', desc: 'Formal and polished' },
  { value: 'enthusiastic', label: '🚀 Enthusiastic', desc: 'Energetic and passionate' },
  { value: 'concise', label: '⚡ Concise', desc: 'Brief and impactful' },
]

export default function CoverLetterPage() {
  const [resumes, setResumes] = useState([])
  const [jobs, setJobs] = useState([])
  const [config, setConfig] = useState({ resume_id: '', job_description_id: '', tone: 'professional', additional_context: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [copied, setCopied] = useState(false)

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
    setLoading(true); setResult(null); setEditing(false)
    try {
      const { data } = await coverLetterAPI.generate(config)
      setResult(data)
      setEditedText(data.cover_letter)
      toast.success('Cover letter generated! ✉️')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed')
    } finally { setLoading(false) }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editing ? editedText : result.cover_letter)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = editing ? editedText : result.cover_letter
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'cover-letter.txt'; a.click()
    toast.success('Downloaded!')
  }

  return (
    <div className="page-content animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✉️ Cover Letter Generator</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Generate a personalized, ATS-optimized cover letter tailored to your target role.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
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
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ''}</option>)}
            </select>
          </div>
        </div>

        {/* Tone Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Tone</label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {TONES.map(({ value, label, desc }) => (
              <div key={value} onClick={() => setConfig({ ...config, tone: value })}
                style={{
                  padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  border: `2px solid ${config.tone === value ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
                  background: config.tone === value ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Additional Context <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
          </label>
          <textarea value={config.additional_context} onChange={(e) => setConfig({ ...config, additional_context: e.target.value })}
            placeholder="e.g. Mention my hackathon win, emphasize my startup experience..."
            style={{ minHeight: '80px', resize: 'vertical' }} />
        </div>

        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BookOpen size={16} />}
          {loading ? 'Generating...' : 'Generate Cover Letter'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={48} color="var(--color-brand-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Writing your personalized cover letter...</p>
        </div>
      )}

      {result && (
        <div className="card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem' }}>Your Cover Letter</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{result.word_count} words</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
                {editing ? <><Check size={14} /> Done Editing</> : <><Edit2 size={14} /> Edit</>}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
                <Download size={14} /> Download
              </button>
            </div>
          </div>

          {editing ? (
            <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)}
              style={{ width: '100%', minHeight: '400px', lineHeight: 1.8, fontSize: '0.9rem', resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.9, fontSize: '0.9rem', color: 'var(--color-text-secondary)', background: 'var(--color-bg-primary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              {editedText}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
