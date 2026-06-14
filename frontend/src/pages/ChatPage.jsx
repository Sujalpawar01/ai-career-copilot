/**
 * Chat Page — RAG-powered conversational career assistant with citations.
 */
import { useState, useRef, useEffect } from 'react'
import { documentAPI, chatAPI } from '@/services/api'
import { Send, Bot, User, Loader2, ChevronDown, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '1.25rem' }}>
      {!isUser && (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
          <Bot size={16} color="white" />
        </div>
      )}
      <div style={{ maxWidth: '75%' }}>
        <div style={{
          padding: '0.875rem 1.125rem', borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))' : 'var(--color-bg-elevated)',
          color: isUser ? 'white' : 'var(--color-text-primary)',
          fontSize: '0.875rem', lineHeight: 1.7,
          boxShadow: isUser ? '0 4px 12px rgba(99,102,241,0.25)' : 'var(--shadow-sm)',
        }}>
          {isUser ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
        </div>
        {msg.sources?.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {msg.sources.slice(0, 3).map((s, i) => (
              <span key={i} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(99,102,241,0.1)', color: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <BookOpen size={10} /> {s.source || `Source ${i + 1}`}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: isUser ? 'right' : 'left' }}>
          {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
          <User size={16} color="var(--color-text-secondary)" />
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  const [resumes, setResumes] = useState([])
  const [jobs, setJobs] = useState([])
  const [selectedResume, setSelectedResume] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    Promise.all([documentAPI.listResumes(), documentAPI.listJobDescriptions()])
      .then(([r, j]) => { setResumes(r.data); setJobs(j.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const SUGGESTED = [
    'How suitable am I for this role?',
    'What skills should I highlight?',
    'What are my biggest gaps?',
    'Write me a cover letter summary',
  ]

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')

    const userMsg = { role: 'user', content: msg, created_at: new Date().toISOString() }
    setMessages((m) => [...m, userMsg])
    setLoading(true)

    try {
      const { data } = await chatAPI.sendMessage({
        message: msg,
        session_id: sessionId || undefined,
        resume_id: selectedResume || undefined,
        job_description_id: selectedJob || undefined,
      })
      setSessionId(data.session_id)
      setMessages((m) => [...m, {
        role: 'assistant', content: data.content,
        sources: data.sources, created_at: data.created_at,
      }])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Chat failed')
      setMessages((m) => m.slice(0, -1))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>🤖 AI Career Assistant</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>RAG-powered with source citations • GPT-4o</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem', width: 'auto' }}>
            <option value="">No resume</option>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}
          </select>
          <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem', width: 'auto' }}>
            <option value="">No job desc</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: 'var(--shadow-glow)' }}>
              <Bot size={36} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>How can I help your career?</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>I have full context of your resume and job description</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => sendMessage(s)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={16} color="white" />
            </div>
            <div style={{ padding: '0.875rem 1.125rem', borderRadius: '18px 18px 18px 4px', background: 'var(--color-bg-elevated)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-brand-primary)', animation: `pulse-glow 1.4s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', maxWidth: '900px', margin: '0 auto' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask about your resume, career fit, missing skills..."
            style={{ flex: 1, resize: 'none', minHeight: '48px', maxHeight: '120px', lineHeight: 1.5, padding: '0.75rem 1rem' }}
            rows={1}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{ padding: '0.75rem', borderRadius: 'var(--radius-lg)', flexShrink: 0 }}
          >
            {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
          Enter to send • Shift+Enter for new line • Responses grounded in your documents
        </p>
      </div>
    </div>
  )
}
