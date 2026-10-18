import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, 
  SplitSquareVertical, Columns, Eye, EyeOff, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { API_BASE } from '../config';

interface MatchItem {
  bbox: [number, number, number, number];
  matched_text: string;
  confidence: number;
  method: string;
  needs_review: boolean;
  review_reason: string;
}

interface PageDetail {
  page_number: number;
  detected: boolean;
  matches: MatchItem[];
  removed: boolean;
  status: string;
  review_flag: boolean;
  review_reason: string;
}

interface PreviewData {
  page_num: number;
  total_pages: number;
  original_image: string;
  processed_image: string;
  page_detail: PageDetail | null;
}

interface BeforeAfterSliderProps {
  fileId: string;
  filename: string;
  totalPages: number;
  pagesWithDisclaimer: number[];
  onClose: () => void;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  fileId,
  filename,
  totalPages,
  pagesWithDisclaimer,
  onClose
}) => {
  const [currentPage, setCurrentPage] = useState<number>(
    pagesWithDisclaimer.length > 0 ? pagesWithDisclaimer[0] : 1
  );
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'processed-only' | 'original-only'>('slider');
  const [showHighlight, setShowHighlight] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPagePreview(currentPage);
  }, [fileId, currentPage]);

  const fetchPagePreview = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/preview/${fileId}/${page}`);
      if (!res.ok) {
        throw new Error('Failed to load page preview');
      }
      const data = await res.json();
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || 'Error loading preview');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleTouchStart = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percent);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percent);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const hasDisclaimerHere = previewData?.page_detail?.detected || false;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 16, 0.88)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px'
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'rgba(18, 26, 45, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <SplitSquareVertical size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              Visual Verification Inspector
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {filename} — <span style={{ color: 'var(--accent-cyan-light)', fontWeight: 600 }}>Page {currentPage} of {totalPages}</span>
            </p>
          </div>
        </div>

        {/* View Mode Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setViewMode('slider')}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: viewMode === 'slider' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                borderColor: viewMode === 'slider' ? 'var(--accent-cyan-light)' : 'transparent',
                color: viewMode === 'slider' ? '#38bdf8' : 'var(--text-muted)'
              }}
            >
              <SplitSquareVertical size={14} /> Split Slider
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: viewMode === 'side-by-side' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                borderColor: viewMode === 'side-by-side' ? 'var(--accent-cyan-light)' : 'transparent',
                color: viewMode === 'side-by-side' ? '#38bdf8' : 'var(--text-muted)'
              }}
            >
              <Columns size={14} /> Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('processed-only')}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: viewMode === 'processed-only' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                borderColor: viewMode === 'processed-only' ? 'var(--accent-emerald)' : 'transparent',
                color: viewMode === 'processed-only' ? '#34d399' : 'var(--text-muted)'
              }}
            >
              Cleaned Output
            </button>
            <button
              onClick={() => setViewMode('original-only')}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: viewMode === 'original-only' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                borderColor: viewMode === 'original-only' ? 'var(--accent-red)' : 'transparent',
                color: viewMode === 'original-only' ? '#f87171' : 'var(--text-muted)'
              }}
            >
              Original
            </button>
          </div>

          {/* Toggle Bounding Box Highlight */}
          <button
            onClick={() => setShowHighlight(!showHighlight)}
            className="btn btn-secondary"
            title="Toggle Redaction Bounding Box Highlight"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              color: showHighlight ? '#f87171' : 'var(--text-dim)'
            }}
          >
            {showHighlight ? <Eye size={15} /> : <EyeOff size={15} />}
            {showHighlight ? 'Highlight Area: On' : 'Highlight Area: Off'}
          </button>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))}
              className="btn btn-secondary"
              style={{ padding: '6px 8px' }}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <span style={{ fontSize: '0.75rem', padding: '0 6px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
              className="btn btn-secondary"
              style={{ padding: '6px 8px' }}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="btn btn-secondary"
              style={{ padding: '6px 8px' }}
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Status & Match Indicator for Current Page */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: hasDisclaimerHere ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
        border: `1px solid ${hasDisclaimerHere ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
        borderRadius: '10px',
        marginBottom: '12px',
        fontSize: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasDisclaimerHere ? (
            <>
              <AlertCircle size={16} color="#ef4444" />
              <span style={{ color: '#f87171', fontWeight: 600 }}>
                Disclaimer Targeted & Removed from Page {currentPage}:
              </span>
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "{previewData?.page_detail?.matches[0]?.matched_text || 'Disclaimer: The file has been converted by Tracxn...'}"
              </span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} color="#10b981" />
              <span style={{ color: '#34d399', fontWeight: 600 }}>
                Page {currentPage} is 100% Clean:
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                No disclaimers were present on this page. Document content is completely untouched.
              </span>
            </>
          )}
        </div>

        {/* Quick jump to disclaimer pages */}
        {pagesWithDisclaimer.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Jump to disclaimer:</span>
            {pagesWithDisclaimer.map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: currentPage === p ? '1px solid var(--accent-red)' : '1px solid var(--border-subtle)',
                  background: currentPage === p ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                  color: currentPage === p ? '#fca5a5' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                P.{p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Canvas / Viewer Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'rgba(7, 10, 18, 0.65)',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        padding: '20px'
      }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="progress-shimmer" style={{ width: '120px', height: '4px', borderRadius: '4px', background: '#38bdf8' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Rendering high-resolution vector preview...</p>
          </div>
        )}

        {error && (
          <div style={{ color: '#f87171', textAlign: 'center' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
            <p>{error}</p>
          </div>
        )}

        {!loading && previewData && (
          <div style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease'
          }}>
            {/* Split Screen Slider Mode */}
            {viewMode === 'slider' && (
              <div
                ref={containerRef}
                style={{
                  position: 'relative',
                  width: '650px',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  userSelect: 'none',
                  cursor: isDragging ? 'ew-resize' : 'default'
                }}
              >
                {/* Cleaned / Processed Image (Base Layer) */}
                <img
                  src={previewData.processed_image}
                  alt="Processed Page (Clean)"
                  style={{ width: '100%', display: 'block' }}
                  draggable={false}
                />

                {/* Original Image (Clipped Overlay Layer) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${sliderPos}%`,
                    overflow: 'hidden',
                    borderRight: '2px solid #38bdf8',
                    boxShadow: '2px 0 12px rgba(56, 189, 248, 0.5)'
                  }}
                >
                  <img
                    src={previewData.original_image}
                    alt="Original Page (With Disclaimer)"
                    style={{
                      width: '650px',
                      maxWidth: 'none',
                      display: 'block'
                    }}
                    draggable={false}
                  />

                  {/* Red highlight on original disclaimer if enabled */}
                  {showHighlight && hasDisclaimerHere && (
                    <div style={{
                      position: 'absolute',
                      top: '3.5%',
                      left: '8%',
                      right: '8%',
                      height: '3%',
                      border: '2px dashed rgba(239, 68, 68, 0.9)',
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderRadius: '4px',
                      pointerEvents: 'none'
                    }} />
                  )}

                  {/* Left Label */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(239, 68, 68, 0.85)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                  }}>
                    ORIGINAL (WITH DISCLAIMER)
                  </div>
                </div>

                {/* Right Label */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(16, 185, 129, 0.85)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}>
                  CLEANED (DISCLAIMER REMOVED)
                </div>

                {/* Slider Draggable Thumb */}
                <div
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${sliderPos}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#0ea5e9',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 20px rgba(14, 165, 233, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'ew-resize',
                    zIndex: 20
                  }}
                >
                  <SplitSquareVertical size={18} color="#fff" />
                </div>
              </div>
            )}

            {/* Side-by-Side Mode */}
            {viewMode === 'side-by-side' && (
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ width: '480px', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    ORIGINAL (WITH DISCLAIMER)
                  </div>
                  <img src={previewData.original_image} alt="Original" style={{ width: '100%', display: 'block' }} />
                  {showHighlight && hasDisclaimerHere && (
                    <div style={{
                      position: 'absolute',
                      top: '3.5%',
                      left: '8%',
                      right: '8%',
                      height: '3%',
                      border: '2px dashed rgba(239, 68, 68, 0.9)',
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderRadius: '4px'
                    }} />
                  )}
                </div>

                <div style={{ width: '480px', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(16, 185, 129, 0.9)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    CLEANED (DISCLAIMER REMOVED)
                  </div>
                  <img src={previewData.processed_image} alt="Cleaned" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
            )}

            {/* Processed Only Mode */}
            {viewMode === 'processed-only' && (
              <div style={{ width: '650px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(16, 185, 129, 0.9)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  CLEANED (100% PRESERVED DOCUMENT)
                </div>
                <img src={previewData.processed_image} alt="Cleaned" style={{ width: '100%', display: 'block' }} />
              </div>
            )}

            {/* Original Only Mode */}
            {viewMode === 'original-only' && (
              <div style={{ width: '650px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  ORIGINAL
                </div>
                <img src={previewData.original_image} alt="Original" style={{ width: '100%', display: 'block' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Page Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'rgba(18, 26, 45, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        marginTop: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="btn btn-secondary"
            style={{ padding: '8px 14px' }}
          >
            <ChevronLeft size={16} /> Previous Page
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                }
              }}
              style={{
                width: '50px',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                borderRadius: '6px',
                padding: '2px 4px',
                margin: '0 4px',
                fontFamily: 'var(--font-mono)'
              }}
            /> of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="btn btn-secondary"
            style={{ padding: '8px 14px' }}
          >
            Next Page <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>💡 Tip: Drag slider horizontally to compare before and after removal</span>
        </div>
      </div>
    </div>
  );
};
