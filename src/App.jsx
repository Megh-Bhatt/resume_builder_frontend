import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, Wand2, Download, Eye, Loader2, Copy,
  CheckCircle2, Circle, ChevronRight, X, RefreshCw,
  Code2, Layers, Briefcase, GraduationCap, FolderOpen,
  Award, Star, Trash2, ArrowLeft
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PIPELINE_NODES = [
  { id: "extract_info",       label: "Reading your resume",          sub: "Extracting structured data" },
  { id: "generate_projects",  label: "Crafting tailored projects",   sub: "Aligning with job requirements" },
  { id: "generate_skills",    label: "Matching technical skills",    sub: "Filtering by relevance" },
  { id: "create_metadata",    label: "Building resume structure",    sub: "Assembling all sections" },
  { id: "generate_latex",     label: "Rendering LaTeX document",     sub: "Formatting for export" },
];

const SECTION_META = {
  experiences:                { label: "Work Experience",              icon: Briefcase,   color: "blue"   },
  projects:                   { label: "Projects",                     icon: FolderOpen,  color: "cyan"   },
  education:                  { label: "Education",                    icon: GraduationCap, color: "violet" },
  positions_of_responsibility:{ label: "Positions of Responsibility",  icon: Star,        color: "amber"  },
  certifications:             { label: "Certifications",               icon: Award,       color: "emerald" },
};

const COLOR_MAP = {
  blue:    { bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)",  badge: "#3b82f6", text: "#93c5fd" },
  cyan:    { bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.2)",   badge: "#06b6d4", text: "#67e8f9" },
  violet:  { bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.2)",  badge: "#8b5cf6", text: "#c4b5fd" },
  amber:   { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  badge: "#f59e0b", text: "#fcd34d" },
  emerald: { bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  badge: "#10b981", text: "#6ee7b7" },
};

// ─── Helpers ──────────────────────────────────────────────────
function parseSSE(text) {
  const events = [];
  const blocks = text.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split('\n');
    let eventType = 'message', data = null;
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim();
      if (line.startsWith('data: ')) { try { data = JSON.parse(line.slice(6)); } catch {} }
    }
    if (data !== null) events.push({ type: eventType, data });
  }
  return events;
}

// ─── Sub-components ───────────────────────────────────────────

function UploadZone({ file, onChange }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') onChange(f);
  };

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${drag ? '#3b82f6' : file ? '#10b981' : '#1e2d45'}`,
        borderRadius: 16,
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? 'rgba(59,130,246,0.06)' : file ? 'rgba(16,185,129,0.05)' : 'transparent',
        transition: 'all 0.2s ease',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files[0]; if (f) onChange(f); }} />
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: file ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {file
          ? <CheckCircle2 size={26} color="#10b981" />
          : <Upload size={26} color="#3b82f6" />}
      </div>
      {file ? (
        <>
          <p style={{ color: '#e2e8f0', fontWeight: 600, margin: 0 }}>{file.name}</p>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Click to replace</p>
        </>
      ) : (
        <>
          <p style={{ color: '#94a3b8', fontWeight: 500, margin: 0 }}>Drop your PDF here</p>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>or click to browse</p>
        </>
      )}
    </div>
  );
}

function NodeProgress({ completed, active }) {
  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      {PIPELINE_NODES.map((node, idx) => {
        const isDone   = completed.includes(node.id);
        const isActive = active === node.id;

        return (
          <div key={node.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: idx < PIPELINE_NODES.length - 1 ? 0 : 0 }}>
            {/* Line + icon column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? 'rgba(16,185,129,0.15)' : isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${isDone ? '#10b981' : isActive ? '#3b82f6' : '#1e2d45'}`,
                transition: 'all 0.4s ease',
                position: 'relative',
                zIndex: 1,
              }}>
                {isDone
                  ? <CheckCircle2 size={18} color="#10b981" />
                  : isActive
                  ? <Loader2 size={18} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Circle size={18} color="#334155" />}
              </div>
              {idx < PIPELINE_NODES.length - 1 && (
                <div style={{
                  width: 1.5,
                  height: 36,
                  background: isDone ? '#10b981' : '#1e2d45',
                  transition: 'background 0.5s ease',
                  marginTop: 2, marginBottom: 2,
                }} />
              )}
            </div>

            {/* Text */}
            <div style={{ paddingTop: 8, paddingBottom: idx < PIPELINE_NODES.length - 1 ? 24 : 0 }}>
              <p style={{
                margin: 0, fontWeight: 600, fontSize: 15,
                color: isDone ? '#e2e8f0' : isActive ? '#93c5fd' : '#475569',
                transition: 'color 0.3s',
              }}>{node.label}</p>
              <p style={{
                margin: '2px 0 0', fontSize: 13,
                color: isDone ? '#64748b' : isActive ? '#475569' : '#334155',
              }}>{node.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ sectionKey, items, onRemove, onClearAll }) {
  const meta = SECTION_META[sectionKey];
  if (!meta || !items?.length) return null;
  const Icon = meta.icon;
  const c = COLOR_MAP[meta.color];

  const getTitle = (item) => {
    if (item.role && item.company)         return `${item.role} · ${item.company}`;
    if (item.name && item.technologies)    return item.name;
    if (item.degree && item.institution)   return `${item.degree} · ${item.institution}`;
    if (item.role && item.organization)    return `${item.role} · ${item.organization}`;
    if (item.name)                         return item.name;
    return '—';
  };
  const getSub = (item) => item.duration || item.date || (item.technologies?.join(', ')) || item.issuer || '';

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: c.bg, border: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} color={c.badge} />
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{meta.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
            background: c.bg, border: `1px solid ${c.border}`, color: c.text,
          }}>{items.length}</span>
        </div>
        <button onClick={onClearAll} style={{
          fontSize: 12, color: '#64748b', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 6,
        }}
          onMouseEnter={e => e.target.style.color = '#ef4444'}
          onMouseLeave={e => e.target.style.color = '#64748b'}
        >
          <Trash2 size={12} /> Clear all
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getTitle(item)}
              </p>
              {getSub(item) && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{getSub(item)}</p>
              )}
            </div>
            <button onClick={() => onRemove(idx)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#475569', flexShrink: 0, padding: 2, borderRadius: 4,
              display: 'flex', alignItems: 'center',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'none'; }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState('upload'); // 'upload' | 'loading' | 'result'
  const [resumeFile, setResumeFile]     = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [completedNodes, setCompletedNodes] = useState([]);
  const [activeNode, setActiveNode]     = useState(null);
  const [loadingMsg, setLoadingMsg]     = useState('Initializing pipeline...');
  const [editedMetadata, setEditedMetadata] = useState(null);
  const [currentLatex, setCurrentLatex] = useState('');
  const [pdfBase64, setPdfBase64]       = useState(null);
  const [showPreview, setShowPreview]   = useState(false);
  const [compiling, setCompiling]       = useState(false);
  const [updating, setUpdating]         = useState(false);
  const [latexCopied, setLatexCopied]   = useState(false);
  const [error, setError]               = useState(null);
  const [isDirty, setIsDirty]           = useState(false);

  // ── Streaming generate ──────────────────────────────────────
  const handleGenerate = async () => {
    if (!resumeFile || !jobDescription.trim()) return;

    setPhase('loading');
    setCompletedNodes([]);
    setActiveNode(PIPELINE_NODES[0].id);
    setLoadingMsg('Reading your resume...');
    setError(null);
    setPdfBase64(null);

    const formData = new FormData();
    formData.append('resume_file', resumeFile);
    formData.append('job_description', jobDescription);

    try {
      const response = await fetch(`${API_BASE}/api/generate-resume-stream`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double newline (SSE event delimiter)
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop(); // keep trailing incomplete chunk

        for (const part of parts) {
          const events = parseSSE(part + '\n\n');
          for (const ev of events) {
            if (ev.type === 'node_complete') {
              const nodeId = ev.data.node;
              setCompletedNodes(prev => [...prev, nodeId]);
              setLoadingMsg(ev.data.label + '...');
              // Advance active to next node
              const nextIdx = PIPELINE_NODES.findIndex(n => n.id === nodeId) + 1;
              if (nextIdx < PIPELINE_NODES.length) {
                setActiveNode(PIPELINE_NODES[nextIdx].id);
              } else {
                setActiveNode(null);
              }
            } else if (ev.type === 'complete') {
              const { metadata, latex_code } = ev.data;
              setEditedMetadata(metadata);
              setCurrentLatex(latex_code || '');
              setPhase('result');
              compilePDF(latex_code);
            } else if (ev.type === 'error') {
              throw new Error(ev.data.error || 'Pipeline error');
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      setPhase('upload');
    }
  };

  const compilePDF = useCallback(async (latex) => {
    setCompiling(true);
    try {
      const fd = new FormData();
      fd.append('latex_code', latex);
      const res = await fetch(`${API_BASE}/api/compile-latex`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setPdfBase64(data.pdf_base64);
    } catch (e) { console.error('PDF compile error:', e); }
    finally { setCompiling(false); }
  }, []);

  const handleUpdateResume = async () => {
    if (!editedMetadata) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/regenerate-latex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedMetadata),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentLatex(data.latex_code);
        setIsDirty(false);
        await compilePDF(data.latex_code);
      }
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  };

  const removeItem = (key, idx) => {
    setEditedMetadata(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
    setIsDirty(true);
  };

  const clearSection = (key) => {
    setEditedMetadata(prev => ({ ...prev, [key]: [] }));
    setIsDirty(true);
  };

  const copyLatex = async () => {
    await navigator.clipboard.writeText(currentLatex);
    setLatexCopied(true);
    setTimeout(() => setLatexCopied(false), 2000);
  };

  const downloadLatex = () => {
    const blob = new Blob([currentLatex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tailored-resume.tex'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!pdfBase64) return;
    const a = document.createElement('a');
    a.href = `data:application/pdf;base64,${pdfBase64}`;
    a.download = 'tailored-resume.pdf'; a.click();
  };

  const canGenerate = resumeFile && jobDescription.trim().length > 0;

  // ── Styles ──────────────────────────────────────────────────
  const styles = {
    root: {
      minHeight: '100vh',
      background: '#080c14',
      color: '#e2e8f0',
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
    },
    topBar: {
      height: 60,
      borderBottom: '1px solid #0f1e30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      background: 'rgba(8,12,20,0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    },
    logo: {
      display: 'flex', alignItems: 'center', gap: 10,
    },
    logoIcon: {
      width: 34, height: 34, borderRadius: 10,
      background: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    logoText: {
      fontSize: 17, fontWeight: 700, color: '#f1f5f9',
      letterSpacing: '-0.3px',
    },
  };

  // ── Upload Phase ─────────────────────────────────────────────
  if (phase === 'upload') {
    return (
      <div style={styles.root}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
          textarea::placeholder { color: #334155 !important; }
          textarea:focus { outline: none; }
          button:focus { outline: none; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #0a1020; }
          ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 4px; }
        `}</style>

        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}><FileText size={18} color="white" /></div>
            <span style={styles.logoText}>OneClickAI</span>
          </div>
          <span style={{ fontSize: 12, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
            Powered by Claude + LangGraph
          </span>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '64px 24px 48px', animation: 'fadeUp 0.5s ease' }}>
          <div style={{
            display: 'inline-block', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
            color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 99, padding: '4px 14px', marginBottom: 20, textTransform: 'uppercase',
          }}>AI-Powered Resume Tailoring</div>
          <h1 style={{ margin: '0 0 16px', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.15 }}>
            Single click<br />
            <span style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              resume builder
            </span>
          </h1>
          <p style={{ color: '#64748b', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Upload your resume and paste a job description. Our AI pipeline generates a perfectly tailored LaTeX resume in seconds.
          </p>
        </div>

        {/* Main card */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px', animation: 'fadeUp 0.5s ease 0.1s both' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#fca5a5',
              fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <X size={16} /> {error}
            </div>
          )}

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
            background: '#0a1020', border: '1px solid #0f1e30', borderRadius: 20, padding: 28,
          }}>
            {/* Left: Upload */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your Resume
              </label>
              <UploadZone file={resumeFile} onChange={setResumeFile} />
            </div>

            {/* Right: Job Description */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                style={{
                  flex: 1, minHeight: 180,
                  background: '#050810', border: '2px solid #0f1e30', borderRadius: 16,
                  padding: 16, color: '#e2e8f0', fontSize: 14, resize: 'none',
                  fontFamily: "'Outfit', sans-serif", lineHeight: 1.6,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                onBlur={e => e.target.style.borderColor = '#0f1e30'}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                background: canGenerate
                  ? 'linear-gradient(135deg, #1d4ed8, #0891b2)'
                  : '#0f1e30',
                color: canGenerate ? 'white' : '#334155',
                border: 'none', borderRadius: 14, padding: '16px 40px',
                fontSize: 16, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: canGenerate ? '0 8px 32px rgba(29,78,216,0.35)' : 'none',
                transition: 'all 0.2s',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <Wand2 size={18} />
              Generate Tailored Resume
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading Phase ────────────────────────────────────────────
  if (phase === 'loading') {
    const progressPct = (completedNodes.length / PIPELINE_NODES.length) * 100;

    return (
      <div style={{ ...styles.root, display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(400%); } }
          ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a1020; }
          ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 4px; }
        `}</style>

        <div style={styles.topBar}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}><FileText size={18} color="white" /></div>
            <span style={styles.logoText}>OneClickAI</span>
          </div>
          <span style={{ fontSize: 12, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
            {completedNodes.length}/{PIPELINE_NODES.length} nodes complete
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#0f1e30', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #1d4ed8, #06b6d4)',
            transition: 'width 0.6s ease',
          }} />
          {progressPct < 100 && (
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%', width: '25%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite',
            }} />
          )}
        </div>

        {/* Center content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 24px',
          animation: 'fadeUp 0.4s ease',
        }}>
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Wand2 size={30} color="#3b82f6" style={{ animation: 'spin 3s linear infinite' }} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>
              Building your resume
            </h2>
            <p style={{ margin: 0, color: '#3b82f6', fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }}>
              {loadingMsg}
            </p>
          </div>

          <NodeProgress completed={completedNodes} active={activeNode} />
        </div>
      </div>
    );
  }

  // ── Result Phase ─────────────────────────────────────────────
  return (
    <div style={{ ...styles.root, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        textarea { font-family: 'JetBrains Mono', monospace !important; }
        textarea::placeholder { color: #334155 !important; }
        textarea:focus { outline: none; }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #050810; }
        ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 4px; }
      `}</style>

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setPhase('upload')} style={{
            background: 'none', border: '1px solid #0f1e30', borderRadius: 8,
            color: '#64748b', cursor: 'pointer', padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            fontFamily: "'Outfit', sans-serif",
          }}>
            <ArrowLeft size={14} /> New Resume
          </button>
          <div style={styles.logo}>
            <div style={styles.logoIcon}><FileText size={18} color="white" /></div>
            <span style={styles.logoText}>OneClickAI</span>
          </div>
          {editedMetadata?.name && (
            <span style={{ fontSize: 13, color: '#334155' }}>— {editedMetadata.name}</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pdfBase64 && (
            <button onClick={() => setShowPreview(true)} style={{
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
              color: '#93c5fd', borderRadius: 8, padding: '7px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: "'Outfit', sans-serif",
            }}>
              <Eye size={14} /> Preview
            </button>
          )}
          {pdfBase64 && (
            <button onClick={downloadPDF} style={{
              background: 'linear-gradient(135deg, #1d4ed8, #0891b2)',
              border: 'none', color: 'white', borderRadius: 8, padding: '7px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 12px rgba(29,78,216,0.3)',
              fontFamily: "'Outfit', sans-serif",
            }}>
              <Download size={14} /> Download PDF
            </button>
          )}
          {compiling && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Compiling...
            </div>
          )}
        </div>
      </div>

      {/* Two-panel body */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr',
        overflow: 'hidden', animation: 'fadeIn 0.4s ease',
      }}>

        {/* ── Left: Editable Sections ── */}
        <div style={{
          borderRight: '1px solid #0f1e30',
          overflowY: 'auto',
          padding: '24px 20px',
          background: '#080c14',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={15} color="#3b82f6" />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>Resume Sections</span>
            </div>
            <button
              onClick={handleUpdateResume}
              disabled={updating}
              style={{
                background: updating ? '#0f1e30' : 'rgba(16,185,129,0.15)',
                border: `1px solid ${updating ? '#0f1e30' : 'rgba(16,185,129,0.3)'}`,
                color: updating ? '#334155' : '#6ee7b7',
                borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                cursor: updating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {updating
                ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</>
                : <><RefreshCw size={12} /> Regenerate</>}
            </button>
          </div>

          {/* Contact */}
          {editedMetadata && (
            <div style={{
              background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)',
              borderRadius: 12, padding: 16, marginBottom: 24,
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Contact</p>
              <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{editedMetadata.name}</p>
              <p style={{ margin: '2px 0', fontSize: 13, color: '#64748b' }}>{editedMetadata.email}</p>
              {editedMetadata.phone && <p style={{ margin: '2px 0', fontSize: 13, color: '#64748b' }}>{editedMetadata.phone}</p>}
            </div>
          )}

          {/* Sections */}
          {editedMetadata && Object.entries(SECTION_META).map(([key]) => (
            <SectionCard
              key={key}
              sectionKey={key}
              items={editedMetadata[key]}
              onRemove={(idx) => removeItem(key, idx)}
              onClearAll={() => clearSection(key)}
            />
          ))}

          {/* Skills */}
          {editedMetadata?.technical_skills && Object.keys(editedMetadata.technical_skills).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Code2 size={14} color="#8b5cf6" />
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>Technical Skills</span>
              </div>
              <div style={{
                background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                {Object.entries(editedMetadata.technical_skills).map(([cat, skills]) => (
                  <div key={cat} style={{ marginBottom: 8, lastChild: { marginBottom: 0 } }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6', textTransform: 'capitalize' }}>{cat}:</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 6 }}>
                      {Array.isArray(skills) ? skills.join(', ') : skills}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 8 }}>
            Remove items above to update your resume
          </p>

          {/* Spacer so content isn't hidden behind the floating button */}
          {isDirty && <div style={{ height: 80 }} />}

          {/* ── Floating Regenerate Button ── */}
          {isDirty && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 0 4px',
              background: 'linear-gradient(to top, #080c14 60%, transparent)',
              animation: 'floatUp 0.25s ease',
            }}>
              <button
                onClick={handleUpdateResume}
                disabled={updating}
                style={{
                  width: '100%',
                  background: updating
                    ? '#0f1e30'
                    : 'linear-gradient(135deg, #059669, #0891b2)',
                  border: 'none',
                  color: updating ? '#334155' : 'white',
                  borderRadius: 12,
                  padding: '13px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: updating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: "'Outfit', sans-serif",
                  boxShadow: updating ? 'none' : '0 4px 24px rgba(5,150,105,0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {updating
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Regenerating...</>
                  : <><RefreshCw size={15} /> Regenerate Resume</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Right: LaTeX Editor ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#050810', overflow: 'hidden',
        }}>
          {/* Editor toolbar */}
          <div style={{
            height: 50, borderBottom: '1px solid #0f1e30',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', flexShrink: 0, background: '#080c14',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginLeft: 8 }}>
                tailored-resume.tex
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={downloadLatex} style={{
                background: '#0f1e30', border: '1px solid #1e2d45',
                color: '#94a3b8', borderRadius: 7, padding: '5px 12px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: "'Outfit', sans-serif",
              }}>
                <Download size={12} /> .tex
              </button>
              <button onClick={copyLatex} style={{
                background: latexCopied ? 'rgba(16,185,129,0.15)' : '#0f1e30',
                border: `1px solid ${latexCopied ? 'rgba(16,185,129,0.3)' : '#1e2d45'}`,
                color: latexCopied ? '#6ee7b7' : '#94a3b8',
                borderRadius: 7, padding: '5px 12px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s',
              }}>
                {latexCopied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={currentLatex}
            onChange={(e) => setCurrentLatex(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: '#7dd3fc', fontSize: 12.5, lineHeight: 1.7,
              padding: '20px 24px', resize: 'none', whiteSpace: 'pre',
              overflowY: 'auto', caretColor: '#3b82f6',
            }}
            spellCheck={false}
          />

          {/* Recompile bar */}
          <div style={{
            borderTop: '1px solid #0f1e30', padding: '12px 20px',
            background: '#080c14', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
              Edit LaTeX directly and recompile
            </span>
            <button
              onClick={() => compilePDF(currentLatex)}
              disabled={compiling}
              style={{
                background: compiling ? '#0f1e30' : 'rgba(6,182,212,0.15)',
                border: `1px solid ${compiling ? '#0f1e30' : 'rgba(6,182,212,0.3)'}`,
                color: compiling ? '#334155' : '#67e8f9',
                borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
                cursor: compiling ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {compiling
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Compiling...</>
                : <><Wand2 size={13} /> Recompile PDF</>}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && pdfBase64 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: '#0a1020', border: '1px solid #0f1e30',
            borderRadius: 20, width: '100%', maxWidth: 860,
            maxHeight: '92vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #0f1e30',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Resume Preview</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={downloadPDF} style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #0891b2)',
                  border: 'none', color: 'white', borderRadius: 8, padding: '6px 14px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  <Download size={13} /> Download
                </button>
                <button onClick={() => setShowPreview(false)} style={{
                  background: '#0f1e30', border: '1px solid #1e2d45',
                  color: '#94a3b8', borderRadius: 8, padding: '6px 10px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <iframe
                src={`data:application/pdf;base64,${pdfBase64}`}
                style={{ width: '100%', height: '100%', border: 'none', minHeight: 600 }}
                title="Resume Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}