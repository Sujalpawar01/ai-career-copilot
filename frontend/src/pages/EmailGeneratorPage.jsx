/**
 * Email Generator Page — Cold email, LinkedIn message, and follow-up tabs.
 */
import { useState } from 'react'
import { documentAPI, emailAPI } from '@/services/api'
import { Mail, Loader2, Copy, Check, Send, Linkedin, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'cold', label: '📧 Cold Email', desc: 'Reach out to a hiring manager' },
  { key: 'linkedin', label: '🔗 LinkedIn', desc: 'Connection request message' },
  { key: 'followup', label: '🔁 Follow-Up', desc: 'After interview or application' },
]

export default function EmailGeneratorPage() {
  const [resumes, setResumes] = useState([])
  const [jobs, setJobs] = useState([])
  const [tab, setTab] = useState('cold')
  const [config, setConfig] = useState({
    resume_id: '', job_description_id: '',
    recipient_name: '', company_name: '', additional_context: '',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useState(() => {
    Promise.all([documentAPI.listResumes(), documentAPI.listJobDescriptions()])
      .then(([r, j]) => { setResumes(r.data); setJobs(j.data) })
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!config.resume_id) { toast.error('Please select a resume'); return }
    setLoading(true); setResult(null)
    try {
      const payload = { ...config, job_description_id: config.job_description_id || undefined }
      let data
      if (tab === 'cold') ({ data } = await emailAPI.coldEmail(payload))
      else if (tab === 'linkedin') ({ data } = await emailAPI.linkedinMessage(payload))
      else ({ data } = await emailAPI.followupEmail(payload))
      setResult(data)
      toast.success('Email generated! 📨')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed')
    } finally { setLoading(false) }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const fullEmail = result ? `Subject: ${result.subject}\n\n${result.body}` : ''

  return (
    <div className="page-content animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📬 Email Generator</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Generate professional outreach emails tailored to your resume and target role.
        </p>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map(({ key, label, desc }) => (
          <div key={key} onClick={() => { setTab(key); setResult(null) }}
            style={{
              padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              border: `2px solid ${tab === key ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
              background: tab === key ? 'rgba(99,102,241,0.08)' : 'var(--color-bg-card)',
              transition: 'all var(--transition-fast)', minWidth: '160px',
            }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: tab === key ? 'var(--color-brand-primary)' : 'var(--color-text-primary)' }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Configuration */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Resume *</label>
            <select value={config.resume_id} onChange={(e) => setConfig({ ...config, resume_id: e.target.value })}>
              <option value="">— Select resume —</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Job Description</label>
            <select value={config.job_description_id} onChange={(e) => setConfig({ ...config, job_description_id: e.target.value })}>
              <option value="">— Optional —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Recipient Name</label>
            <input value={config.recipient_name} onChange={(e) => setConfig({ ...config, recipient_name: e.target.value })}
              placeholder="e.g. Sarah Johnson" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Company Name</label>
            <input value={config.company_name} onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
              placeholder="e.g. Stripe" />
          </div>
        </div>

        {tab === 'followup' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Context <span style={{ color: 'var(--color-text-muted)' }}>(e.g. interview date, topics discussed)</span>
            </label>
            <textarea value={config.additional_context} onChange={(e) => setConfig({ ...config, additional_context: e.target.value })}
              placeholder="Had a great interview on June 3rd. Discussed system design and distributed systems."
              style={{ minHeight: '80px', resize: 'vertical' }} />
          </div>
        )}

        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          {loading ? 'Generating...' : `Generate ${TABS.find(t => t.key === tab)?.label}`}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <Loader2 size={40} color="var(--color-brand-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Crafting your email...</p>
        </div>
      )}

      {result && (
        <div className="card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem' }}>Generated Email</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{result.word_count} words</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(fullEmail)}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy All</>}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleGenerate}>
                <RefreshCw size={14} /> Regenerate
              </button>
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => handleCopy(result.subject)}>
                <Copy size={11} /> Copy
              </button>
            </div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {result.subject}
            </div>
          </div>

          {/* Body */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body</label>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => handleCopy(result.body)}>
                <Copy size={11} /> Copy
              </button>
            </div>
            <div style={{
              whiteSpace: 'pre-wrap', lineHeight: 1.9, fontSize: '0.875rem',
              color: 'var(--color-text-secondary)', background: 'var(--color-bg-primary)',
              padding: '1.25rem', borderRadius: 'var(--radius-md)',
            }}>
              {result.body}
            </div>
            {tab === 'linkedin' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.5rem' }}>
                ⚠️ LinkedIn messages are limited to 300 characters. Character count: {result.body.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
