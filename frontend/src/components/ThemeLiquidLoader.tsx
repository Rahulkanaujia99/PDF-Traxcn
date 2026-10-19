import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import animationData from '../assets/liquid-loading-blue.json';

interface ThemeLiquidLoaderProps {
  statusText?: string;
  subText?: string;
  width?: string | number;
  height?: string | number;
}

export const ThemeLiquidLoader: React.FC<ThemeLiquidLoaderProps> = ({
  statusText,
  subText,
  width = 280,
  height = 50
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
      padding: '4px 0',
      userSelect: 'none',
      width: '100%',
      maxWidth: typeof width === 'number' ? `${width}px` : width
    }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: typeof height === 'number' ? `${height}px` : height,
          background: 'transparent',
          filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.45))'
        }} 
      />
      {statusText && (
        <span style={{
          fontSize: '0.84rem',
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          color: '#ffffff',
          letterSpacing: '0.02em',
          marginTop: '2px',
          textAlign: 'center'
        }}>
          {statusText}
        </span>
      )}
      {subText && (
        <span style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          color: '#38bdf8',
          letterSpacing: '0.04em',
          marginTop: '3px',
          textAlign: 'center',
          textShadow: '0 0 10px rgba(56, 189, 248, 0.4)'
        }}>
          {subText}
        </span>
      )}
    </div>
  );
};
