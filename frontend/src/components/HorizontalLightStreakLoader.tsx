import React from 'react';

interface HorizontalLightStreakLoaderProps {
  statusText?: string;
}

export const HorizontalLightStreakLoader: React.FC<HorizontalLightStreakLoaderProps> = ({
  statusText = 'Uploading Document...'
}) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minWidth: '260px',
      maxWidth: '380px',
      height: '60px',
      backgroundColor: '#05091a',
      borderRadius: '16px',
      border: '1px solid rgba(49, 92, 255, 0.3)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(49, 92, 255, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '8px 16px'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '24px',
        background: 'radial-gradient(ellipse at center, rgba(49, 92, 255, 0.25) 0%, rgba(99, 102, 241, 0.1) 50%, transparent 80%)',
        filter: 'blur(8px)',
        pointerEvents: 'none'
      }} />

      {/* Horizontal Light Streak Track */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Background faint guide line */}
        <div style={{
          position: 'absolute',
          left: '5%',
          right: '5%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(49, 92, 255, 0.3) 20%, rgba(56, 189, 248, 0.3) 50%, rgba(49, 92, 255, 0.3) 80%, transparent 100%)',
          borderRadius: '9999px'
        }} />

        {/* Moving luminous light streak (Image 4 & Reference 1) */}
        <div className="horizontal-light-streak" />
      </div>

      {/* Loading Status Text */}
      <span style={{
        fontSize: '0.8rem',
        fontWeight: 600,
        fontFamily: 'var(--font-display)',
        color: '#A7B0C5',
        letterSpacing: '0.04em',
        marginTop: '4px',
        animation: 'pulseText 1.6s ease-in-out infinite alternate',
        textShadow: '0 0 10px rgba(56, 189, 248, 0.4)'
      }}>
        {statusText}
      </span>
    </div>
  );
};
