/**
 * Job Description Page — Paste text or upload a file.
 */
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { documentAPI } from '@/services/api'
import { Briefcase, Upload, FileText, Trash2, Loader2, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = ['paste', 'upload']

export default function JobDescriptionPage() {
  const [tab, setTab] = useState('paste')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ title: '', company: '', raw_text: '' })

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await documentAPI.listJobDescriptions()
      setJobs(data)
    } catch { toast.error('Failed to load job descriptions') }
    finally { setLoaded(true) }
  }, [])

  useState(() => { fetchJobs() }, [])

  const handlePasteSubmit = async (e) => {
    e.preventDefault()
    if (form.raw_text.length < 50) {
      toast.error('Job description must be at least 50 characters')
      return
    }
    setLoading(true)
    try {
      await documentAPI.createJobDescription(form)
      toast.success('Job description saved! ✅')
      setForm({ title: '', company: '', raw_text: '' })
      await fetchJobs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally { setLoading(false) }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file || !form.title) {
      toast.error('Please enter a job title first')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', form.title)
    if (form.company) fd.append('company', form.company)

    setLoading(true)
    try {
      await documentAPI.uploadJobDescription(fd)
      toast.success('Job description uploaded! ✅')
      await fetchJobs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally { setLoading(false) }
  }, [form.title, form.company, fetchJobs])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1, disabled: loading,
  })

  return (
    <div className="page-content animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💼 Job Descriptions</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Add job descriptions to compare against your resume and generate tailored content.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', padding: '4px', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
                background: tab === t ? 'var(--color-brand-primary)' : 'transparent',
                color: tab === t ? 'white' : 'var(--color-text-muted)',
                transition: 'all var(--transition-fast)',
              }}>
              {t === 'paste' ? '✏️ Paste Text' : '📁 Upload File'}
            </button>
          ))}
        </div>

        {/* Common Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Job Title *
            </label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Senior Software Engineer" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Company Name
            </label>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="e.g. Google" />
          </div>
        </div>

        {tab === 'paste' ? (
          <form onSubmit={handlePasteSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Job Description Text *
              </label>
              <textarea
                value={form.raw_text}
                onChange={(e) => setForm({ ...form, raw_text: e.target.value })}
                placeholder="Paste the full job description here..."
                required
                style={{ minHeight: '200px', resize: 'vertical', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {form.raw_text.length} characters
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <PenLine size={16} />}
              {loading ? 'Saving...' : 'Save Job Description'}
            </button>
          </form>
        ) : (
          <div>
            <div {...getRootProps()} style={{
              border: `2px dashed ${isDragActive ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-xl)', padding: '2.5rem', textAlign: 'center',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all var(--transition-base)',
              background: isDragActive ? 'rgba(99,102,241,0.05)' : 'var(--color-bg-primary)',
            }}>
              <input {...getInputProps()} />
              {loading
                ? <Loader2 size={40} color="var(--color-brand-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                : (
                  <>
                    <Upload size={40} color="var(--color-brand-primary)" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ fontWeight: 600 }}>{isDragActive ? 'Drop here!' : 'Drag & drop JD file'}</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>PDF or DOCX • Make sure to fill job title above</p>
                  </>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Jobs List */}
      {jobs.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Saved Jobs ({jobs.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {jobs.map((job) => (
              <div key={job.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Briefcase size={22} color="var(--color-brand-secondary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>{job.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {job.company && `${job.company} • `}{new Date(job.created_at).toLocaleDateString()}
                    {job.match_score && <span style={{ marginLeft: '0.5rem', color: 'var(--color-success)', fontWeight: 600 }}>Match: {Math.round(job.match_score)}%</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
