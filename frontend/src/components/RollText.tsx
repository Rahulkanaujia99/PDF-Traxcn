import React from 'react';

interface RollTextProps {
  text: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable animated rolling text component inspired by Flowtica (Screenshot 2).
 * On parent button hover or focus, the text smoothly rolls up vertically,
 * revealing a fresh copy from below. Arrow icons nudge horizontally.
 * Screen-reader accessible: clone has aria-hidden="true".
 */
export const RollText: React.FC<RollTextProps> = ({
  text,
  icon,
  iconPosition = 'right',
  className = '',
  style
}) => {
  return (
    <span className={`btn-roll-content ${className}`} style={style}>
      {icon && iconPosition === 'left' && (
        <span className="btn-roll-icon-left">{icon}</span>
      )}

      <span className="btn-roll-track">
        <span className="btn-roll-stack">
          <span className="btn-roll-item">{text}</span>
          <span className="btn-roll-item" aria-hidden="true">{text}</span>
        </span>
      </span>

      {icon && iconPosition === 'right' && (
        <span className="btn-roll-arrow">{icon}</span>
      )}
    </span>
  );
};

export default RollText;
