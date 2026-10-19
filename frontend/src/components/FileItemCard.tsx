import React from 'react';
import { 
  FileText, CheckCircle2, AlertTriangle, AlertCircle, 
  Download, ShieldCheck, Play, Loader2, Sparkles 
} from 'lucide-react';
import { InfinityLoopLoader } from './InfinityLoopLoader';

export interface FileRecord {
  id: string;
  filename: string;
  processed_filename: string;
  size: number;
  formatted_size: string;
  page_count: number;
  upload_path: string;
  processed_path: string | null;
  status: 'READY' | 'PROCESSING' | 'SUCCESS' | 'NO_MATCH' | 'NEEDS_REVIEW' | 'FAILED';
  progress: number;
  pages_scanned: number;
  disclaimers_removed: number;
  disclaimers_found: number;
  needs_review_count: number;
  pages_with_disclaimer: number[];
  validation: any | null;
  page_details: any[];
  error_message: string | null;
}

interface FileItemCardProps {
  file: FileRecord;
  onProcess: (id: string) => void;
  onViewReport: (file: FileRecord) => void;
  onDownload: (id: string, filename?: string) => void;
}

export const FileItemCard: React.FC<FileItemCardProps> = ({
  file,
  onProcess,
  onViewReport,
  onDownload
}) => {
  const getStatusBadge = () => {
    switch (file.status) {
      case 'SUCCESS':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={13} /> Cleaned ({file.disclaimers_removed} Removed)
          </span>
        );
      case 'NO_MATCH':
        return (
          <span className="badge badge-neutral">
            <ShieldCheck size={13} /> Already Clean (0 Found)
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="badge badge-processing">
            <Loader2 size={13} className="spin-slow" /> Scanning P.{file.pages_scanned}/{file.page_count}
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="badge badge-warning">
            <AlertTriangle size={13} /> Needs Review ({file.needs_review_count})
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-failed">
            <AlertCircle size={13} /> Failed
          </span>
        );
      case 'READY':
      default:
        return (
          <span className="badge badge-ready">
            <Sparkles size={13} /> Ready to Scan
          </span>
        );
    }
  };

  const isProcessed = ['SUCCESS', 'NO_MATCH', 'NEEDS_REVIEW'].includes(file.status);

  return (
    <div className="glass-panel" style={{
      padding: '22px 26px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative',
      borderRadius: '20px',
      background: 'var(--bg-card)'
    }}>
      {/* Top Row: File icon, names, status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: isProcessed 
              ? 'rgba(16, 185, 129, 0.12)' 
              : 'rgba(49, 92, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isProcessed ? '#34d399' : '#315cff',
            border: `1px solid ${isProcessed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(49, 92, 255, 0.3)'}`,
            flexShrink: 0
          }}>
            <FileText size={22} />
          </div>

          <div style={{ minWidth: 0 }}>
            <h4 style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-main)',
              marginBottom: '3px',
              wordBreak: 'break-word'
            }}>
              {file.filename}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>{file.formatted_size}</span>
              <span>•</span>
              <span><strong style={{ color: 'var(--text-main)' }}>{file.page_count}</strong> Pages</span>
              {file.pages_with_disclaimer && file.pages_with_disclaimer.length > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#f87171' }}>
                    Disclaimer on p.{file.pages_with_disclaimer.slice(0, 3).join(', ')}
                    {file.pages_with_disclaimer.length > 3 ? ` +${file.pages_with_disclaimer.length - 3} more` : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {getStatusBadge()}
        </div>
      </div>

      {/* Glowing Infinity-Loop Animation (Image 3 & Reference 2) when processing */}
      {file.status === 'PROCESSING' ? (
        <InfinityLoopLoader
          statusText={`Scanning & coordinate analysis: ${file.pages_scanned} of ${file.page_count} pages...`}
          progress={file.progress}
        />
      ) : file.progress > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>
              {file.status === 'SUCCESS' 
                ? `Completed: ${file.disclaimers_removed} disclaimers scrubbed from ${file.page_count} pages`
                : `Scan complete (${file.page_count} pages inspected)`
              }
            </span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{file.progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${file.progress}%` }} />
          </div>
        </div>
      )}

      {/* Error Message if any */}
      {file.error_message && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          fontSize: '0.84rem',
          color: '#f87171'
        }}>
          {file.error_message}
        </div>
      )}

      {/* Bottom Actions Row (Before/After Preview removed per specification) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '10px',
        borderTop: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isProcessed && (
            <button
              onClick={() => onViewReport(file)}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '6px 16px' }}
              title="View QA validation certificate"
            >
              <ShieldCheck size={15} color="#10b981" /> QA Certificate
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {file.status === 'READY' && (
            <button
              onClick={() => onProcess(file.id)}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 20px' }}
            >
              <Play size={15} /> Remove Disclaimer
            </button>
          )}

          {isProcessed && (
            <button
              onClick={() => onDownload(file.id, file.processed_filename)}
              className="btn btn-action"
              style={{ fontSize: '0.85rem', padding: '8px 20px' }}
            >
              <Download size={15} /> Download Cleaned PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileItemCard;
