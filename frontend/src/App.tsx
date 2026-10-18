import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, Play, Download, Trash2, ShieldCheck, 
  Sparkles, AlertCircle, Info, FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileItemCard } from './components/FileItemCard';
import type { FileRecord } from './components/FileItemCard';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { ValidationReportModal } from './components/ValidationReportModal';
import { API_BASE } from './config';

export const App: React.FC = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activePreviewFile, setActivePreviewFile] = useState<FileRecord | null>(null);
  const [activeReportFile, setActiveReportFile] = useState<FileRecord | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll active processing tasks
  useEffect(() => {
    const processingFiles = files.filter(f => f.status === 'PROCESSING');
    if (processingFiles.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/files`);
        if (res.ok) {
          const data = await res.json();
          const prevProcessing = files.filter(f => f.status === 'PROCESSING').length;
          const currProcessing = data.files.filter((f: any) => f.status === 'PROCESSING').length;
          
          setFiles(data.files);

          // If all just finished, fire celebratory confetti
          if (prevProcessing > 0 && currProcessing === 0) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 }
            });
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [files]);

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

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setErrorToast(null);

    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.name.toLowerCase().endsWith('.pdf')) {
        formData.append('files', f);
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload files.');
      }
      fetchFiles();
    } catch (err: any) {
      setErrorToast(err.message || 'Error uploading files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateSample = async () => {
    setIsUploading(true);
    setErrorToast(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate-sample`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate sample PDF');
      fetchFiles();
    } catch (err: any) {
      setErrorToast(err.message || 'Error generating sample');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessSingle = async (fileId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/process/${fileId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to initiate processing');
      // Optimistically update file state
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'PROCESSING', progress: 10 } : f));
    } catch (err: any) {
      setErrorToast(err.message || 'Error starting process');
    }
  };

  const handleProcessAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/process-all`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to initiate batch processing');
      setFiles(prev => prev.map(f => (f.status === 'READY' || f.status === 'FAILED') ? { ...f, status: 'PROCESSING', progress: 10 } : f));
    } catch (err: any) {
      setErrorToast(err.message || 'Error starting batch process');
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

  // Metrics calculations
  const totalFiles = files.length;
  const totalPages = files.reduce((acc, f) => acc + (f.page_count || 0), 0);
  const totalDisclaimersRemoved = files.reduce((acc, f) => acc + (f.disclaimers_removed || 0), 0);
  const processedFilesCount = files.filter(f => ['SUCCESS', 'NO_MATCH', 'NEEDS_REVIEW'].includes(f.status)).length;
  const readyFilesCount = files.filter(f => f.status === 'READY').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notification */}
      {errorToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease'
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

      {/* Top Header Bar */}
      <header style={{
        padding: '16px 36px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 29, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(14, 165, 233, 0.4)'
          }}>
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                PDF Disclaimer Cleaner
              </h1>
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                AI-Powered • 100% Vector Preservation
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Remove unwanted PDF disclaimers while preserving your original financial reports.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleGenerateSample}
            className="btn btn-outline-cyan"
            disabled={isUploading}
            title="Load sample financial statement with Tracxn disclaimer header"
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            <Sparkles size={16} /> Load Sample Financial Report
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Exact Target Information Banner */}
        <div className="glass-panel" style={{
          padding: '16px 22px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ color: '#38bdf8', marginTop: '2px' }}>
              <Info size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', fontWeight: 700 }}>
                  Active Redaction Rule:
                </span>
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  Exact Match Only
                </span>
              </div>
              <p style={{
                fontSize: '0.92rem',
                fontFamily: 'var(--font-mono)',
                color: '#f87171',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '4px 10px',
                borderRadius: '6px',
                display: 'inline-block',
                marginTop: '4px'
              }}>
                "Disclaimer: The file has been converted by Tracxn to improve readabilty of financial data"
              </p>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '340px' }}>
            Protects all financial figures, tables, dates, stamps, and logos. Redaction operates directly on vector streams with zero compression loss.
          </div>
        </div>

        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) {
              handleUploadFiles(e.dataTransfer.files);
            }
          }}
          style={{
            border: `2px dashed ${isDragging ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '20px',
            padding: '44px 24px',
            textAlign: 'center',
            background: isDragging 
              ? 'rgba(14, 165, 233, 0.08)' 
              : 'rgba(16, 23, 41, 0.45)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.25s ease',
            cursor: 'pointer',
            boxShadow: isDragging ? 'var(--shadow-glow)' : 'none'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) handleUploadFiles(e.target.files);
            }}
            multiple
            accept=".pdf"
            style={{ display: 'none' }}
          />

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2))',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#38bdf8'
          }}>
            <UploadCloud size={32} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '6px' }}>
            Upload Financial Statement PDFs
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>
            Drag and drop single or multiple financial reports, or click to browse files
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '10px 24px' }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '10px 20px' }}
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateSample();
              }}
            >
              <Sparkles size={16} color="#38bdf8" /> Try Instant Demo
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip (if files exist) */}
        {totalFiles > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Uploaded Documents
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '4px' }}>
                {totalFiles}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pages Audited
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '4px' }}>
                {totalPages}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Disclaimers Scrubbed
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399', marginTop: '4px' }}>
                {totalDisclaimersRemoved}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Integrity Preservation
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981', marginTop: '4px' }}>
                100%
              </div>
            </div>
          </div>
        )}

        {/* Batch Action Toolbar */}
        {totalFiles > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: 'rgba(18, 25, 43, 0.65)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                Processing Queue ({totalFiles} files)
              </h3>
              {readyFilesCount > 0 && (
                <span className="badge badge-ready">{readyFilesCount} Pending</span>
              )}
              {processedFilesCount > 0 && (
                <span className="badge badge-success">{processedFilesCount} Cleaned</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {readyFilesCount > 0 && (
                <button
                  onClick={handleProcessAll}
                  className="btn btn-primary"
                  style={{ fontSize: '0.88rem', padding: '8px 18px' }}
                >
                  <Play size={15} /> Remove Disclaimers from All
                </button>
              )}

              {processedFilesCount > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="btn btn-action"
                  style={{ fontSize: '0.88rem', padding: '8px 18px' }}
                >
                  <Download size={15} /> Download All (ZIP)
                </button>
              )}

              <button
                onClick={handleClearAll}
                className="btn btn-danger-ghost"
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                title="Clear all uploaded documents"
              >
                <Trash2 size={15} /> Clear Files
              </button>
            </div>
          </div>
        )}

        {/* Files Dashboard List */}
        {totalFiles > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {files.map(file => (
              <FileItemCard
                key={file.id}
                file={file}
                onProcess={handleProcessSingle}
                onPreview={(f) => setActivePreviewFile(f)}
                onViewReport={(f) => setActiveReportFile(f)}
                onDownload={handleDownload}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-dim)',
            background: 'rgba(15, 23, 42, 0.3)',
            borderRadius: '16px',
            border: '1px dashed var(--border-subtle)'
          }}>
            <FileSpreadsheet size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>No documents currently loaded</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Upload any converted financial report PDF or click "Try Instant Demo" above to get started.
            </p>
          </div>
        )}
      </main>

      {/* Visual Inspector Modal */}
      {activePreviewFile && (
        <BeforeAfterSlider
          fileId={activePreviewFile.id}
          filename={activePreviewFile.filename}
          totalPages={activePreviewFile.page_count}
          pagesWithDisclaimer={activePreviewFile.pages_with_disclaimer || []}
          onClose={() => setActivePreviewFile(null)}
        />
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

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        background: 'rgba(7, 10, 18, 0.7)'
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
