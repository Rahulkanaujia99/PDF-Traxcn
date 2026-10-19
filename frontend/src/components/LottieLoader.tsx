import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import animationData from '../assets/loading-animation.json';

interface LottieLoaderProps {
  statusText?: string;
  size?: number;
}

export const LottieLoader: React.FC<LottieLoaderProps> = ({
  statusText = 'Uploading Document...',
  size = 76
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet'
      }
    });

    return () => {
      anim.destroy();
    };
  }, []);

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      padding: '0',
      userSelect: 'none'
    }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: `${size}px`, 
          height: `${size * 0.75}px`,
          background: 'transparent',
          filter: 'drop-shadow(0 0 10px rgba(64, 140, 255, 0.4))'
        }} 
      />
      {statusText && (
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          color: '#38bdf8',
          letterSpacing: '0.03em',
          marginTop: '2px',
          textShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
        }}>
          {statusText}
        </span>
      )}
    </div>
  );
};
