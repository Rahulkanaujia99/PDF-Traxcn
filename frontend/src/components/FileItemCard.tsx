import React from 'react';
import { 
  FileText, CheckCircle2, AlertTriangle, AlertCircle, 
  Download, Eye, ShieldCheck, Play, Loader2, Sparkles 
} from 'lucide-react';

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
  onPreview: (file: FileRecord) => void;
  onViewReport: (file: FileRecord) => void;
  onDownload: (id: string, filename?: string) => void;
}

export const FileItemCard: React.FC<FileItemCardProps> = ({
  file,
  onProcess,
  onPreview,
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
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative'
    }}>
      {/* Top Row: File icon, names, status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: isProcessed 
              ? 'rgba(16, 185, 129, 0.12)' 
              : 'rgba(56, 189, 248, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isProcessed ? '#34d399' : '#38bdf8',
            border: `1px solid ${isProcessed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.25)'}`
          }}>
            <FileText size={22} />
          </div>

          <div>
            <h4 style={{
              fontSize: '1.02rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-main)',
              marginBottom: '2px'
            }}>
              {file.filename}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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

        <div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Progress Bar (when processing or finished) */}
      {(file.status === 'PROCESSING' || file.progress > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>
              {file.status === 'PROCESSING' 
                ? `Scanning & coordinate analysis: ${file.pages_scanned} of ${file.page_count} pages...`
                : file.status === 'SUCCESS' 
                  ? `Completed: ${file.disclaimers_removed} disclaimers scrubbed from ${file.page_count} pages`
                  : `Scan complete (${file.page_count} pages inspected)`
              }
            </span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{file.progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${file.progress}%` }}>
              {file.status === 'PROCESSING' && <div className="progress-shimmer" />}
            </div>
          </div>
        </div>
      )}

      {/* Error Message if any */}
      {file.error_message && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: '#f87171'
        }}>
          {file.error_message}
        </div>
      )}

      {/* Bottom Actions Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '8px',
        borderTop: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isProcessed && (
            <>
              <button
                onClick={() => onPreview(file)}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                title="View interactive before & after visual comparison"
              >
                <Eye size={15} color="#38bdf8" /> Before / After Preview
              </button>

              <button
                onClick={() => onViewReport(file)}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                title="View QA validation certificate"
              >
                <ShieldCheck size={15} color="#10b981" /> QA Certificate
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {file.status === 'READY' && (
            <button
              onClick={() => onProcess(file.id)}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '7px 16px' }}
            >
              <Play size={15} /> Remove Disclaimer
            </button>
          )}

          {isProcessed && (
            <button
              onClick={() => onDownload(file.id, file.processed_filename)}
              className="btn btn-action"
              style={{ fontSize: '0.85rem', padding: '7px 16px' }}
            >
              <Download size={15} /> Download Cleaned PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
