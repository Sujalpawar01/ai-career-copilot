/**
 * Resume Upload Page — Drag-and-drop resume upload with preview.
 */
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { documentAPI } from '@/services/api'
import { FileText, Upload, CheckCircle, Trash2, Loader2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResumeUploadPage() {
  const [resumes, setResumes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const fetchResumes = useCallback(async () => {
    try {
      const { data } = await documentAPI.listResumes()
      setResumes(data)
    } catch {
      toast.error('Failed to load resumes')
    } finally {
      setLoaded(true)
    }
  }, [])

  useState(() => { fetchResumes() }, [])

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const { data } = await documentAPI.uploadResume(formData)
      toast.success('Resume uploaded and parsed! ✅')
      await fetchResumes()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [fetchResumes])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  const handleDelete = async (id) => {
    try {
      await documentAPI.deleteResume(id)
      toast.success('Resume deleted')
      setResumes((r) => r.filter((x) => x.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch {
      toast.error('Failed to delete resume')
    }
  }

  return (
    <div className="page-content animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄 Resume Manager</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Upload your PDF or DOCX resume. Our AI will parse and index it for analysis.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-xl)', padding: '3rem 2rem', textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all var(--transition-base)',
          background: isDragActive ? 'rgba(99,102,241,0.05)' : 'var(--color-bg-card)',
          marginBottom: '2rem',
          boxShadow: isDragActive ? 'var(--shadow-glow)' : 'none',
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={48} color="var(--color-brand-primary)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>Uploading and parsing your resume...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: isDragActive ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--transition-base)',
            }}>
              <Upload size={36} color="var(--color-brand-primary)" />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                {isDragActive ? 'Drop your resume here!' : 'Drag & drop your resume here'}
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                or <span style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>click to browse</span>
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Supports PDF and DOCX • Max 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resumes List */}
      {resumes.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Uploaded Resumes ({resumes.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {resumes.map((resume) => (
              <div key={resume.id} className="card" style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                border: selected?.id === resume.id ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border)',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={22} color="var(--color-brand-primary)" />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resume.original_filename}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {resume.file_type.toUpperCase()} • {new Date(resume.created_at).toLocaleDateString()}
                    {resume.parsed_text && <span style={{ marginLeft: '0.5rem', color: 'var(--color-success)' }}>✓ Parsed</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelected(selected?.id === resume.id ? null : resume)}
                  >
                    <Eye size={14} />
                    {selected?.id === resume.id ? 'Hide' : 'Preview'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(resume.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {selected && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>📋 Parsed Content — {selected.original_filename}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕ Close</button>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem',
            color: 'var(--color-text-secondary)', lineHeight: 1.7, maxHeight: '400px', overflowY: 'auto',
            background: 'var(--color-bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)',
          }}>
            {selected.parsed_text || 'No text extracted'}
          </pre>
        </div>
      )}

      {loaded && resumes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No resumes uploaded yet. Drag and drop your first resume above!</p>
        </div>
      )}
    </div>
  )
}
