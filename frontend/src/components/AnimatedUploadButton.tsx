import React from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

export type ButtonUploadState = 'idle' | 'loading' | 'success' | 'error';

interface AnimatedUploadButtonProps {
  state: ButtonUploadState;
  progress?: number;
  label?: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const AnimatedUploadButton: React.FC<AnimatedUploadButtonProps> = ({
  state,
  progress = 0,
  label = 'Upload Document',
  loadingLabel = 'Uploading Document...',
  successLabel = 'Uploaded!',
  errorLabel = 'Upload Failed',
  onClick,
  disabled = false,
  style,
  className = ''
}) => {
  const isInteractive = state === 'idle' && !disabled;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="dribbble-button-wrapper" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        type="button"
        onClick={isInteractive ? onClick : undefined}
        disabled={!isInteractive}
        aria-busy={state === 'loading'}
        className={`dribbble-upload-btn dribbble-btn-${state} ${className}`}
        style={{
          ...style,
          cursor: isInteractive ? 'pointer' : 'default',
          pointerEvents: state === 'loading' ? 'none' : undefined
        }}
      >
        {/* Loading State: Embedded Track & Animated Progress Bar inside the button */}
        {state === 'loading' && (
          <div className="dribbble-btn-progress-container">
            {/* Background Track */}
            <div className="dribbble-btn-progress-track">
              {/* Dynamic Fill Bar */}
              <div
                className="dribbble-btn-progress-fill"
                style={{
                  width: `${Math.max(8, clampedProgress)}%`
                }}
              />
            </div>
            {/* Centered Status Text */}
            <span className="dribbble-btn-label loading-label">
              {loadingLabel} {clampedProgress > 0 ? `${Math.round(clampedProgress)}%` : ''}
            </span>
          </div>
        )}

        {/* Idle State: Normal Button with Upload Icon */}
        {state === 'idle' && (
          <span className="dribbble-btn-label">
            <UploadCloud size={18} className="dribbble-btn-icon" />
            <span>{label}</span>
          </span>
        )}

        {/* Success State: Spring Checkmark */}
        {state === 'success' && (
          <span className="dribbble-btn-label success-label">
            <CheckCircle2 size={18} className="dribbble-btn-icon spring-pop" />
            <span>{successLabel}</span>
          </span>
        )}

        {/* Error State: Alert Icon */}
        {state === 'error' && (
          <span className="dribbble-btn-label error-label">
            <AlertCircle size={18} className="dribbble-btn-icon" />
            <span>{errorLabel}</span>
          </span>
        )}
      </button>
    </div>
  );
};

export default AnimatedUploadButton;
