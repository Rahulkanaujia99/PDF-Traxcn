import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, Play, Download, Trash2, ShieldCheck, 
  Sparkles, AlertCircle, Info, X,
  FileText, CheckCircle2, FileCheck, Clock, Square, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileItemCard } from './components/FileItemCard';
import type { FileRecord } from './components/FileItemCard';
import { ValidationReportModal } from './components/ValidationReportModal';
import { FynticBackground } from './components/FynticBackground';
import { RollText } from './components/RollText';
import { AnimatedUploadButton } from './components/AnimatedUploadButton';
import type { ButtonUploadState } from './components/AnimatedUploadButton';
import { API_BASE } from './config';

type PageType = 'home' | 'process' | 'documents';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageType>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'process' || hash === 'documents') return hash;
    return 'home';
  });

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadButtonState, setUploadButtonState] = useState<ButtonUploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [activeReportFile, setActiveReportFile] = useState<FileRecord | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live timer for header current time & date
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'process' || hash === 'documents' || hash === 'home') {
        setActivePage(hash as PageType);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: PageType) => {
    setActivePage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stable poll for active processing tasks
  const isAnyProcessing = files.some(f => f.status === 'PROCESSING' || f.status === 'CANCELLATION_REQUESTED');
  const prevProcessingCountRef = useRef(0);

  useEffect(() => {
    if (!isAnyProcessing) return;

    let isMounted = true;
    const pollActive = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/files`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const currProcessing = (data.files || []).filter((f: any) => f.status === 'PROCESSING' || f.status === 'CANCELLATION_REQUESTED').length;

          // If all just finished, fire celebratory confetti
          if (prevProcessingCountRef.current > 0 && currProcessing === 0) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
          }
          prevProcessingCountRef.current = currProcessing;

          setFiles(data.files);
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    };

    // Quick initial poll at 200ms, then recurring every 750ms
    const timer = setTimeout(pollActive, 200);
    const interval = setInterval(pollActive, 750);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isAnyProcessing]);

  // Initial fetch on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Fetch files error:', err);
    }
  };

  const handleStageFiles = (fileList: FileList | File[]): File[] => {
    if (!fileList || fileList.length === 0) return [];
    setErrorToast(null);

    const validPdfs: File[] = [];
    let hasInvalid = false;

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.name.toLowerCase().endsWith('.pdf')) {
        validPdfs.push(f);
      } else {
        hasInvalid = true;
      }
    }

    if (hasInvalid && validPdfs.length === 0) {
      setErrorToast('Please select valid PDF documents (.pdf)');
      return [];
    }

    setStagedFiles(validPdfs);
    return validPdfs;
  };

  const handleUploadFiles = async (filesToUpload: File[]) => {
    if (!filesToUpload || filesToUpload.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadButtonState('loading');
    setUploadProgress(15);
    setErrorToast(null);

    const formData = new FormData();
    for (let i = 0; i < filesToUpload.length; i++) {
      formData.append('files', filesToUpload[i]);
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 85);
            setUploadProgress(Math.max(15, pct));
          }
        };

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(100);
              resolve();
            } else {
              reject(new Error(json.error || json.detail || 'Failed to upload files.'));
            }
          } catch {
            reject(new Error('Invalid response from server.'));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload. Please ensure backend is running.'));
        };

        xhr.send(formData);
      });

      // Clear staged files and fetch updated files from backend
      setStagedFiles([]);
      await fetchFiles();

      // Dribbble Success state transition (spring pop checkmark)
      setUploadButtonState('success');

      // Fire celebratory confetti on successful upload
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Automatically navigate to Process page after brief checkmark display
      setTimeout(() => {
        setUploadButtonState('idle');
        setIsUploading(false);
        navigateTo('process');
      }, 750);

    } catch (err: any) {
      setUploadButtonState('error');
      setErrorToast(err.message || 'Error uploading files');
      setTimeout(() => {
        setUploadButtonState('idle');
        setIsUploading(false);
      }, 2000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateSample = async () => {
    setIsUploading(true);
    setErrorToast(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate-sample`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate sample PDF');
      await fetchFiles();
      setStagedFiles([]);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });

      // Navigate to Process page to view the generated sample report
      navigateTo('process');
    } catch (err: any) {
      setErrorToast(err.message || 'Error generating sample');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessSingle = async (fileId: string) => {
    // 1. Immediately update UI state so button transitions to PROCESSING and loader starts with 0ms delay
    setFiles(prev => prev.map(f => f.id === fileId ? { 
      ...f, 
      status: 'PROCESSING', 
      progress: 5,
      pages_scanned: 0,
      error_message: null 
    } : f));

    try {
      const res = await fetch(`${API_BASE}/api/process/${fileId}`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || 'Failed to initiate processing');
      }
    } catch (err: any) {
      // Rollback to READY on failure and show error toast
      setFiles(prev => prev.map(f => f.id === fileId ? { 
        ...f, 
        status: 'READY', 
        progress: 0,
        error_message: err.message || 'Error starting process' 
      } : f));
      setErrorToast(err.message || 'Error starting process');
    }
  };

  const handleProcessAll = async () => {
    // 1. Immediately update all eligible files to PROCESSING
    setFiles(prev => prev.map(f => (f.status === 'READY' || f.status === 'FAILED' || f.status === 'VALIDATION_FAILED') ? { 
      ...f, 
      status: 'PROCESSING', 
      progress: 5,
      pages_scanned: 0,
      error_message: null 
    } : f));

    try {
      const res = await fetch(`${API_BASE}/api/process-all`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || 'Failed to initiate batch processing');
      }
    } catch (err: any) {
      await fetchFiles();
      setErrorToast(err.message || 'Error starting batch process');
    }
  };

  const handleCancelSingle = async (fileId: string) => {
    // 1. Immediately set status to CANCELLATION_REQUESTED so user sees instant feedback
    setFiles(prev => prev.map(f => f.id === fileId ? {
      ...f,
      status: 'CANCELLATION_REQUESTED'
    } : f));

    try {
      const res = await fetch(`${API_BASE}/api/cancel/${fileId}`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || 'Failed to cancel conversion');
      }
    } catch (err: any) {
      console.error('Cancel error:', err);
      setErrorToast(err.message || 'Error requesting cancellation');
    } finally {
      await fetchFiles();
    }
  };

  const handleCancelAll = async () => {
    // Immediately set all processing files to CANCELLATION_REQUESTED
    setFiles(prev => prev.map(f => f.status === 'PROCESSING' ? {
      ...f,
      status: 'CANCELLATION_REQUESTED'
    } : f));

    try {
      const res = await fetch(`${API_BASE}/api/cancel-all`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || 'Failed to cancel all conversions');
      }
    } catch (err: any) {
      console.error('Cancel all error:', err);
      setErrorToast(err.message || 'Error requesting cancellation');
    } finally {
      await fetchFiles();
    }
  };

  const handleDownload = async (fileId: string, customFilename?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/download/${fileId}`);
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);

      // Ensure target name ends with .pdf
      let targetName = customFilename || 'cleaned_financial_statement.pdf';
      if (!targetName.toLowerCase().endsWith('.pdf')) {
        targetName += '.pdf';
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = targetName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 300);
    } catch (err: any) {
      console.error('Download error:', err);
      window.location.href = `${API_BASE}/api/download/${fileId}`;
    }
  };

  const handleDownloadAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/download-all`);
      if (!res.ok) throw new Error('Batch download failed');

      const blob = await res.blob();
      const zipBlob = new Blob([blob], { type: 'application/zip' });
      const url = window.URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'cleaned_financial_reports.zip';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 300);
    } catch (err: any) {
      console.error('Batch download error:', err);
      window.location.href = `${API_BASE}/api/download-all`;
    }
  };

  const handleClearAll = async () => {
    if (files.length === 0) return;
    try {
      await fetch(`${API_BASE}/api/clear`, { method: 'DELETE' });
      setFiles([]);
    } catch (err) {
      console.error('Clear error:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Metrics calculations
  const totalFiles = files.length;
  const totalPages = files.reduce((acc, f) => acc + (f.page_count || 0), 0);
  const totalDisclaimersRemoved = files.reduce((acc, f) => acc + (f.disclaimers_removed || 0), 0);
  const processedFilesCount = files.filter(f => ['SUCCESS', 'NO_MATCH', 'NEEDS_REVIEW'].includes(f.status)).length;
  const readyFilesCount = files.filter(f => f.status === 'READY' || f.status === 'FAILED' || f.status === 'VALIDATION_FAILED').length;
  const convertedFiles = files.filter(f => ['SUCCESS', 'NO_MATCH', 'NEEDS_REVIEW'].includes(f.status));

  // Modern formatted date and time
  const formattedDate = `${currentDateTime.toLocaleDateString('en-US', { weekday: 'short' })}, ${currentDateTime.getDate()} ${currentDateTime.toLocaleDateString('en-US', { month: 'short' })} ${currentDateTime.getFullYear()}`;
  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent', position: 'relative' }}>
      
      {/* Global Fyntic 3D Space Warp Particle Engine with Central Blue Glow across ALL pages */}
      <FynticBackground />

      {/* Toast Notification */}
      {errorToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.25s ease'
        }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{errorToast}</span>
          <button 
            onClick={() => setErrorToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', marginLeft: '10px', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Shared Horizontal Navigation Bar (Image 2 Inspiration: Fully Transparent Header) */}
      <header className="main-header" style={{
        padding: '16px 36px',
        borderBottom: 'none',
        background: 'transparent',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease'
      }}>
        {/* Brand Logo & Name */}
        <div 
          onClick={() => navigateTo('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #315cff 0%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(49, 92, 255, 0.45)'
          }}>
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="brand-text-animated" style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)',
              color: '#ffffff'
            }}>
              Doclear
            </span>
          </div>
        </div>

        {/* Center Pill Navigation (Image 2 Inspiration: Home, Process, Show Documents) */}
        <nav className="nav-pill-container">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className={`nav-pill-item ${activePage === 'home' ? 'active' : ''}`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => navigateTo('process')}
            className={`nav-pill-item ${activePage === 'process' ? 'active' : ''}`}
          >
            Process
            {totalFiles > 0 && <span className="nav-counter">{totalFiles}</span>}
          </button>
          <button
            type="button"
            onClick={() => navigateTo('documents')}
            className={`nav-pill-item ${activePage === 'documents' ? 'active' : ''}`}
          >
            Show Documents
            {convertedFiles.length > 0 && <span className="nav-counter">{convertedFiles.length}</span>}
          </button>
        </nav>

        {/* Right Action: Modern Live Date & Time Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="header-datetime-pill" title="Live System Time">
            <div className="datetime-pulse-indicator">
              <span className="datetime-ping" />
              <span className="datetime-dot" />
            </div>
            <Clock size={13} className="datetime-icon" />
            <span className="datetime-date">{formattedDate}</span>
            <span className="datetime-divider">•</span>
            <span className="datetime-time">{formattedTime}</span>
          </div>
        </div>
      </header>

      {/* PAGE A: HOME (with Fyntic 3D Space Warp Particles and Glowing Highlight) */}
      {activePage === 'home' && (
        <section className="hero-wrapper">
          {/* Hero Content */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', width: '100%', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', marginBottom: '18px' }}>
              <span className="badge" style={{
                background: 'rgba(49, 92, 255, 0.12)',
                border: '1px solid rgba(49, 92, 255, 0.3)',
                color: '#9cb3ff',
                padding: '6px 14px',
                fontSize: '0.78rem'
              }}>
                AI-Powered • 100% Vector Preservation
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              <span className="brand-text-animated">Doclear</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: '680px',
              margin: '0 auto'
            }}>
              Remove unwanted PDF disclaimers while preserving your original financial reports.
            </p>
          </div>

          {/* Central File Upload Panel with continuous glowing circular highlight (Flowtica / Screenshot 1) */}
          <div 
            className={`ai-prompt-box border-beam-card ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                handleStageFiles(e.dataTransfer.files);
              }
            }}
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const valid = handleStageFiles(e.target.files);
                  if (valid.length > 0) {
                    handleUploadFiles(valid);
                  }
                }
              }}
              multiple
              accept=".pdf"
              style={{ display: 'none' }}
            />

            {/* Interactive Drop / Staged Area */}
            <div style={{ padding: '36px 32px 28px' }}>
              {stagedFiles.length === 0 ? (
                /* State 1: Dropzone Initial View (Centrally Aligned Upload Document Button) */
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isUploading ? 'default' : 'pointer',
                    padding: '24px 16px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, rgba(49, 92, 255, 0.25) 0%, rgba(30, 64, 175, 0.15) 100%)',
                    border: '1px solid rgba(49, 92, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7094ff',
                    marginBottom: '16px',
                    boxShadow: '0 8px 24px rgba(49, 92, 255, 0.2)'
                  }}>
                    <UploadCloud size={32} />
                  </div>

                  <h3 style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    color: '#ffffff',
                    marginBottom: '8px'
                  }}>
                    Upload Document
                  </h3>
                  <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.92rem',
                    marginBottom: '24px',
                    maxWidth: '480px',
                    lineHeight: 1.5
                  }}>
                    Drag and drop single or multiple financial reports, or click the button below to browse
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatedUploadButton
                      state={uploadButtonState}
                      progress={uploadProgress}
                      label="Upload Document"
                      loadingLabel="Uploading Document..."
                      disabled={isUploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* State 2 & 3: User Selected File(s) Staged View (Centrally Aligned Upload Action) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} color="#34d399" />
                      <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>
                        Selected for Upload ({stagedFiles.length} {stagedFiles.length === 1 ? 'file' : 'files'})
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setStagedFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: isUploading ? 0.5 : 1
                      }}
                    >
                      <X size={14} /> Clear selection
                    </button>
                  </div>

                  {/* Staged Files List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                    {stagedFiles.map((file, idx) => (
                      <div key={idx} className="staged-file-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(49, 92, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#7094ff',
                            flexShrink: 0
                          }}>
                            <FileText size={18} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{
                              fontSize: '0.92rem',
                              fontWeight: 600,
                              color: '#ffffff',
                              wordBreak: 'break-word',
                              lineHeight: 1.3
                            }}>
                              {file.name}
                            </p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => {
                            const updated = stagedFiles.filter((_, i) => i !== idx);
                            setStagedFiles(updated);
                            if (updated.length === 0 && fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px',
                            color: 'var(--text-muted)',
                            cursor: isUploading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isUploading ? 0.4 : 1
                          }}
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Centrally Aligned Upload Action Button (Requirement 1 & 2) */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: '18px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    gap: '12px'
                  }}>
                    <AnimatedUploadButton
                      state={uploadButtonState}
                      progress={uploadProgress}
                      label="Upload Document"
                      loadingLabel="Uploading Document..."
                      disabled={isUploading || stagedFiles.length === 0}
                      onClick={() => handleUploadFiles(stagedFiles)}
                    />

                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '0.82rem',
                        padding: '6px 18px',
                        opacity: isUploading ? 0.4 : 1,
                        pointerEvents: isUploading ? 'none' : undefined
                      }}
                    >
                      Browse Additional Files
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Bottom Bar: Active Redaction Rule */}
            <div className="prompt-bottom-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Redaction Rule:
                </span>
                <span className="badge" style={{ 
                  background: 'rgba(6, 182, 212, 0.15)', 
                  color: '#38bdf8', 
                  border: '1px solid rgba(56, 189, 248, 0.35)', 
                  fontSize: '0.7rem' 
                }}>
                  Exact Match Only
                </span>
              </div>

              <p style={{
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                color: '#38bdf8',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                padding: '5px 12px',
                borderRadius: '6px',
                wordBreak: 'break-word',
                boxShadow: '0 0 14px rgba(6, 182, 212, 0.08)'
              }}>
                "Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data"
              </p>
            </div>
          </div>

          {/* Floating Pill Chips */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '24px', flexWrap: 'wrap', zIndex: 1 }}>
            <span className="pill-chip">
              <ShieldCheck size={14} color="#34d399" /> 100% Vector Preservation
            </span>
            <span className="pill-chip">
              <CheckCircle2 size={14} color="#315cff" /> Zero Compression Loss
            </span>
            <span className="pill-chip">
              <Info size={14} color="#7094ff" /> Coordinate Redaction & Text Stream Preservation
            </span>
          </div>

          {/* Protection Note */}
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-dim)',
            maxWidth: '640px',
            margin: '14px auto 0 auto',
            textAlign: 'center',
            lineHeight: 1.5,
            zIndex: 1
          }}>
            Protects all financial figures, tables, dates, stamps, and logos. Redaction operates directly on vector streams with zero compression loss.
          </p>
        </section>
      )}

      {/* PAGE B: PROCESS DASHBOARD */}
      {activePage === 'process' && (
        <section className="page-container process-page-wrapper">
          <div className="process-page-content">
            {/* Queue Header Bar */}
            <div className="queue-toolbar border-beam-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                  Processing Queue ({totalFiles} files)
                </h3>
                {readyFilesCount > 0 && (
                  <span className="badge badge-ready">{readyFilesCount} Pending</span>
                )}
                {processedFilesCount > 0 && (
                  <span className="badge badge-success">{processedFilesCount} Cleaned</span>
                )}
                {isAnyProcessing && (
                  <span className="badge badge-processing">
                    <Clock size={12} className="spin-slow" /> Processing Active
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {isAnyProcessing && (
                  <button
                    onClick={handleCancelAll}
                    className="btn btn-stop-all btn-roll"
                    style={{ fontSize: '0.88rem', padding: '9px 18px' }}
                    title="Stop all currently active conversions"
                  >
                    <RollText text="Stop All Conversions" icon={<Square size={13} fill="#f87171" />} iconPosition="left" />
                  </button>
                )}

                {readyFilesCount > 0 && (
                  <button
                    onClick={handleProcessAll}
                    className="btn btn-primary btn-roll"
                    style={{ fontSize: '0.88rem', padding: '9px 20px' }}
                  >
                    <RollText text="Remove Disclaimers from All" icon={<Play size={15} />} iconPosition="left" />
                  </button>
                )}

                {processedFilesCount > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    className="btn btn-action btn-roll"
                    style={{ fontSize: '0.88rem', padding: '9px 20px' }}
                  >
                    <RollText text="Download All (ZIP)" icon={<Download size={15} />} iconPosition="left" />
                  </button>
                )}

                {totalFiles > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="btn btn-danger-ghost btn-roll"
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                    title="Clear all uploaded documents"
                  >
                    <RollText text="Clear Files" icon={<Trash2 size={15} />} iconPosition="left" />
                  </button>
                )}
              </div>
            </div>

            {/* 4 Summary Statistic Cards (Clean Static Borders with Quantiva Hover Lift) */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Uploaded Documents
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '6px' }}>
                  {totalFiles}
                </div>
              </div>

              <div className="metric-card">
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pages Audited
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#7094ff', marginTop: '6px' }}>
                  {totalPages}
                </div>
              </div>

              <div className="metric-card">
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Disclaimers Scrubbed
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399', marginTop: '6px' }}>
                  {totalDisclaimersRemoved}
                </div>
              </div>

              <div className="metric-card">
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Integrity Preservation
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981', marginTop: '6px' }}>
                  100%
                </div>
              </div>
            </div>

            {/* Uploaded Document Cards Stacked Vertically */}
            {totalFiles > 0 ? (
              <div className="files-queue-list">
                {files.map(file => (
                  <FileItemCard
                    key={file.id}
                    file={file}
                    onProcess={handleProcessSingle}
                    onCancel={handleCancelSingle}
                    onViewReport={(f) => setActiveReportFile(f)}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state-box" style={{
                padding: '60px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                borderRadius: '20px',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <UploadCloud size={44} style={{ opacity: 0.4, color: '#7094ff' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  No documents currently in the processing queue
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '460px' }}>
                  Upload financial statement PDFs on the Home page or click below to load an instant demo.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    onClick={() => navigateTo('home')}
                    className="btn btn-primary btn-roll"
                    style={{ fontSize: '0.88rem', padding: '9px 22px' }}
                  >
                    <RollText text="Go to Home & Upload" icon={<ArrowRight size={14} />} iconPosition="right" />
                  </button>
                  <button
                    onClick={handleGenerateSample}
                    className="btn btn-secondary btn-roll"
                    disabled={isUploading}
                    style={{ fontSize: '0.88rem', padding: '9px 20px' }}
                  >
                    <RollText text="Try Instant Demo" icon={<Sparkles size={15} color="#7094ff" />} iconPosition="left" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PAGE C: SHOW DOCUMENTS */}
      {activePage === 'documents' && (
        <section className="page-container documents-page-wrapper">
          <div className="documents-header-box border-beam-card">
            <div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                Converted Documents ({convertedFiles.length})
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                All processed financial reports verified with 100% vector preservation.
              </p>
            </div>

            {convertedFiles.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="btn btn-action btn-roll"
                style={{ fontSize: '0.88rem', padding: '9px 20px' }}
              >
                <RollText text="Download All (ZIP)" icon={<Download size={15} />} iconPosition="left" />
              </button>
            )}
          </div>

          {convertedFiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {convertedFiles.map(file => (
                <FileItemCard
                  key={file.id}
                  file={file}
                  onProcess={handleProcessSingle}
                  onCancel={handleCancelSingle}
                  onViewReport={(f) => setActiveReportFile(f)}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state-box" style={{
              padding: '60px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              background: 'var(--bg-secondary)',
              borderRadius: '20px',
              border: '1px dashed var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FileCheck size={44} style={{ opacity: 0.4, color: '#10b981' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                No converted documents available yet
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '460px' }}>
                Upload financial statement PDFs and remove disclaimers on the Process page to see your converted reports here.
              </p>
              <button
                onClick={() => navigateTo('home')}
                className="btn btn-primary btn-roll"
                style={{ fontSize: '0.88rem', padding: '9px 22px', marginTop: '8px' }}
              >
                <RollText text="Go to Home & Upload" icon={<ArrowRight size={14} />} iconPosition="right" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* QA Validation Modal */}
      {activeReportFile && (
        <ValidationReportModal
          filename={activeReportFile.filename}
          fileId={activeReportFile.id}
          totalPages={activeReportFile.page_count}
          pagesScanned={activeReportFile.pages_scanned}
          disclaimersRemoved={activeReportFile.disclaimers_removed}
          validation={activeReportFile.validation}
          pageDetails={activeReportFile.page_details || []}
          onClose={() => setActiveReportFile(null)}
          onDownload={() => handleDownload(activeReportFile.id, activeReportFile.processed_filename)}
        />
      )}

      {/* Shared Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-subtle)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.82rem',
        color: 'var(--text-dim)',
        background: 'rgba(5, 8, 23, 0.85)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="#10b981" />
          <span>Enterprise Confidentiality: Documents processed in isolated memory and automatically cleared.</span>
        </div>
        <div>
          <span>Coordinate Redaction & Text Stream Preservation</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
