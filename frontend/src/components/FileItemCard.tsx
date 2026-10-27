import React from 'react';
import { 
  FileText, CheckCircle2, AlertTriangle, AlertCircle, 
  Download, ShieldCheck, Play, Loader2, Sparkles, Square, ArrowRight 
} from 'lucide-react';
import { ThemeLiquidLoader } from './ThemeLiquidLoader';
import { RollText } from './RollText';

export interface FileRecord {
  id: string;
  filename: string;
  processed_filename: string;
  size: number;
  formatted_size: string;
  page_count: number;
  upload_path: string;
  processed_path: string | null;
  status: 'READY' | 'PROCESSING' | 'CANCELLATION_REQUESTED' | 'CANCELLED' | 'SUCCESS' | 'NO_MATCH' | 'NEEDS_REVIEW' | 'VALIDATION_FAILED' | 'FAILED';
  progress: number;
  pages_scanned: number;
  disclaimers_removed: number;
  disclaimers_found: number;
  needs_review_count: number;
  pages_with_disclaimer: number[];
  validation: any | null;
  page_details: any[];
  error_message: string | null;
  document_type?: 'TEXT_BASED' | 'SCANNED' | 'MIXED';
  document_type_label?: string;
  has_selectable_text?: boolean;
  has_scanned_images?: boolean;
  text_pages_count?: number;
  scanned_pages_count?: number;
  mixed_pages_count?: number;
}

interface FileItemCardProps {
  file: FileRecord;
  onProcess: (id: string) => void;
  onCancel?: (id: string) => void;
  onViewReport: (file: FileRecord) => void;
  onDownload: (id: string, filename?: string) => void;
}

export const FileItemCard: React.FC<FileItemCardProps> = ({
  file,
  onProcess,
  onCancel,
  onViewReport,
  onDownload
}) => {
  const [isStarting, setIsStarting] = React.useState(false);

  const handleRemoveDisclaimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarting || file.status === 'PROCESSING' || file.status === 'CANCELLATION_REQUESTED') return;
    setIsStarting(true);
    onProcess(file.id);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.status !== 'PROCESSING' || !onCancel) return;
    onCancel(file.id);
  };

  React.useEffect(() => {
    if (file.status === 'PROCESSING') {
      setIsStarting(false);
    }
  }, [file.status]);

  const getStatusBadge = () => {
    switch (file.status) {
      case 'SUCCESS':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={13} /> Completed Successfully ({file.disclaimers_removed} Removed)
          </span>
        );
      case 'NO_MATCH':
        return (
          <span className="badge badge-neutral">
            <ShieldCheck size={13} /> {file.document_type === 'SCANNED' ? 'Scanned Document (Clean)' : 'Verified Clean (0 Found)'}
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="badge badge-processing">
            <Loader2 size={13} className="spin-slow" /> Processing P.{file.pages_scanned}/{file.page_count}
          </span>
        );
      case 'CANCELLATION_REQUESTED':
        return (
          <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
            <Loader2 size={13} className="spin-slow" /> Stopping Conversion...
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="badge badge-cancelled">
            <AlertCircle size={13} /> Conversion Cancelled
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="badge badge-warning">
            <AlertTriangle size={13} /> Needs Review ({file.needs_review_count})
          </span>
        );
      case 'VALIDATION_FAILED':
        return (
          <span className="badge badge-failed" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={13} /> Validation Warning
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-failed">
            <AlertCircle size={13} /> Processing Failed
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
      background: 'rgba(9, 14, 33, 0.35)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255, 255, 255, 0.12)'
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
              : file.status === 'VALIDATION_FAILED' || file.status === 'FAILED'
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(49, 92, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isProcessed ? '#34d399' : file.status === 'VALIDATION_FAILED' || file.status === 'FAILED' ? '#f87171' : '#315cff',
            border: `1px solid ${isProcessed ? 'rgba(16, 185, 129, 0.3)' : file.status === 'VALIDATION_FAILED' || file.status === 'FAILED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(49, 92, 255, 0.3)'}`,
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
              <span>•</span>
              <span style={{
                color: file.document_type === 'SCANNED' ? '#fbbf24' : file.document_type === 'MIXED' ? '#c084fc' : '#60a5fa',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {file.document_type_label || (file.document_type === 'SCANNED' ? 'Scanned Document (Images)' : file.document_type === 'MIXED' ? 'Mixed (Text & Images)' : 'Text-based PDF')}
              </span>
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

      {/* Liquid Theme Animation (IDWO0BQDxw) when processing or halting */}
      {file.status === 'CANCELLED' ? (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '10px',
          fontSize: '0.84rem',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>Conversion cancelled. You can restart conversion or download the original file.</span>
        </div>
      ) : file.status === 'PROCESSING' || file.status === 'CANCELLATION_REQUESTED' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ThemeLiquidLoader
            statusText={file.status === 'CANCELLATION_REQUESTED'
              ? 'Halting document conversion...'
              : `Scanning & coordinate analysis: ${file.pages_scanned} of ${file.page_count} pages...`}
            subText={file.status === 'CANCELLATION_REQUESTED' ? 'Stopping...' : `${file.progress}% Completed`}
            progress={file.progress}
            width="100%"
            height={52}
          />
        </div>
      ) : file.progress > 0 && file.status !== 'READY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>
              {file.status === 'SUCCESS' 
                ? `Completed Successfully: ${file.disclaimers_removed} disclaimer${file.disclaimers_removed === 1 ? '' : 's'} removed • ${file.page_count} pages verified 100% intact`
                : file.status === 'NO_MATCH'
                ? (file.document_type === 'SCANNED'
                    ? `Scan complete: Scanned image document inspected (${file.page_count} pages) • No disclaimer detected`
                    : `Scan complete: ${file.page_count} pages inspected • No Tracxn disclaimer detected`
                  )
                : file.status === 'VALIDATION_FAILED'
                ? `Validation warning detected on ${file.page_count} pages • Original document preserved`
                : file.status === 'NEEDS_REVIEW'
                ? `Scan complete: Flagged for manual review (${file.needs_review_count} page${file.needs_review_count === 1 ? '' : 's'})`
                : `Processing failed (${file.pages_scanned} of ${file.page_count} pages inspected)`
              }
            </span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{file.progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ 
              width: `${file.progress}%`,
              background: file.status === 'VALIDATION_FAILED' || file.status === 'FAILED' ? '#ef4444' : undefined
            }} />
          </div>
        </div>
      )}

      {/* Error / Validation Warning Message if any */}
      {file.error_message && file.status !== 'CANCELLED' && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          fontSize: '0.84rem',
          color: '#f87171',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{file.error_message}</div>
        </div>
      )}

      {/* Bottom Actions Row */}
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
          {(isProcessed || file.status === 'VALIDATION_FAILED') && (
            <button
              onClick={() => onViewReport(file)}
              className="btn btn-secondary btn-roll"
              style={{ fontSize: '0.82rem', padding: '6px 16px' }}
              title="View QA validation certificate"
            >
              <RollText 
                text="QA Certificate" 
                icon={<ShieldCheck size={15} color={file.status === 'VALIDATION_FAILED' ? '#f87171' : '#10b981'} />} 
                iconPosition="left" 
              />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {file.status === 'READY' && (
            <button
              onClick={handleRemoveDisclaimer}
              disabled={isStarting}
              className="btn btn-primary btn-roll"
              style={{ fontSize: '0.85rem', padding: '8px 20px', minWidth: '175px' }}
            >
              {isStarting ? (
                <>
                  <Loader2 size={15} className="spin-slow" /> Starting...
                </>
              ) : (
                <RollText text="Remove Disclaimer" icon={<ArrowRight size={14} />} iconPosition="right" />
              )}
            </button>
          )}

          {file.status === 'PROCESSING' && (
            <button
              onClick={handleStop}
              className="btn btn-stop-conversion btn-roll"
              style={{ fontSize: '0.85rem', padding: '8px 20px' }}
              title="Stop ongoing document conversion"
            >
              <RollText text="Stop Conversion" icon={<Square size={13} fill="#f87171" />} iconPosition="left" />
            </button>
          )}

          {file.status === 'CANCELLATION_REQUESTED' && (
            <button
              disabled
              className="btn btn-stop-conversion"
              style={{ fontSize: '0.85rem', padding: '8px 20px' }}
            >
              <Loader2 size={14} className="spin-slow" /> Stopping...
            </button>
          )}

          {file.status === 'CANCELLED' && (
            <>
              <button
                onClick={handleRemoveDisclaimer}
                disabled={isStarting}
                className="btn btn-primary btn-roll"
                style={{ fontSize: '0.85rem', padding: '8px 20px' }}
              >
                {isStarting ? (
                  <>
                    <Loader2 size={15} className="spin-slow" /> Starting...
                  </>
                ) : (
                  <RollText text="Restart Conversion" icon={<Play size={14} />} iconPosition="left" />
                )}
              </button>
              <button
                onClick={() => onDownload(file.id, file.filename)}
                className="btn btn-secondary btn-roll"
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                title="Download original document"
              >
                <RollText text="Download Original" icon={<Download size={14} />} iconPosition="left" />
              </button>
            </>
          )}

          {(file.status === 'FAILED' || file.status === 'VALIDATION_FAILED') && (
            <>
              <button
                onClick={handleRemoveDisclaimer}
                disabled={isStarting}
                className="btn btn-primary btn-roll"
                style={{ fontSize: '0.85rem', padding: '8px 20px' }}
              >
                {isStarting ? (
                  <>
                    <Loader2 size={15} className="spin-slow" /> Retrying...
                  </>
                ) : (
                  <RollText text="Retry Processing" icon={<Play size={14} />} iconPosition="left" />
                )}
              </button>
              <button
                onClick={() => onDownload(file.id, file.filename)}
                className="btn btn-secondary btn-roll"
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                title="Download original document"
              >
                <RollText text="Download Original" icon={<Download size={14} />} iconPosition="left" />
              </button>
            </>
          )}

          {isProcessed && (
            <button
              onClick={() => onDownload(file.id, file.processed_filename)}
              className="btn btn-action btn-roll"
              style={{ fontSize: '0.85rem', padding: '8px 20px' }}
            >
              <RollText 
                text={file.status === 'SUCCESS' ? 'Download Cleaned PDF' : 'Download PDF'} 
                icon={<Download size={15} />} 
                iconPosition="left" 
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileItemCard;
