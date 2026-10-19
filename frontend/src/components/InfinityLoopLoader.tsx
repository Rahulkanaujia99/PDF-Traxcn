import React from 'react';

interface InfinityLoopLoaderProps {
  statusText?: string;
  progress?: number;
}

const INFINITY_PATH = "M 80,40 C 62,18 40,18 26,29 C 12,40 12,60 26,71 C 40,82 62,82 80,40 C 98,18 120,18 134,29 C 148,40 148,60 134,71 C 120,82 98,82 80,40 Z";

export const InfinityLoopLoader: React.FC<InfinityLoopLoaderProps> = ({
  statusText = 'Removing disclaimers...',
  progress
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 24px',
      background: 'rgba(5, 9, 26, 0.95)',
      borderRadius: '16px',
      border: '1px solid rgba(49, 92, 255, 0.25)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 25px rgba(49, 92, 255, 0.18)',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '180px',
        height: '90px',
        background: 'radial-gradient(ellipse at center, rgba(49, 92, 255, 0.25) 0%, rgba(99, 102, 241, 0.1) 45%, transparent 75%)',
        filter: 'blur(16px)',
        pointerEvents: 'none'
      }} />

      {/* SVG Infinity Loop Animation (Image 3 & Reference 2) */}
      <div style={{ position: 'relative', width: '160px', height: '80px' }}>
        <svg
          viewBox="0 0 160 80"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* Glow Filter for luminous neon blur */}
            <filter id="infinityBloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient along the light trail */}
            <linearGradient id="infinityCyanBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#38BDF8" />
              <stop offset="70%" stopColor="#315CFF" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>

          {/* 1. Base track */}
          <path
            d={INFINITY_PATH}
            fill="none"
            stroke="rgba(49, 92, 255, 0.18)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 2. Wide glowing bloom trail */}
          <path
            className="infinity-loop-trail-glow"
            d={INFINITY_PATH}
            fill="none"
            stroke="url(#infinityCyanBlue)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#infinityBloom)"
          />

          {/* 3. Sharp bright core trail */}
          <path
            className="infinity-loop-trail-core"
            d={INFINITY_PATH}
            fill="none"
            stroke="url(#infinityCyanBlue)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        {/* 4. Moving glowing star comet head */}
        <div
          className="infinity-comet-head"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 12px 3px #38BDF8, 0 0 20px 6px #315CFF',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Loading Status Text & Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '12px', zIndex: 1 }}>
        <span style={{
          fontSize: '0.84rem',
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          color: '#ffffff',
          letterSpacing: '0.02em',
          textShadow: '0 0 12px rgba(56, 189, 248, 0.5)'
        }}>
          {statusText}
        </span>

        {typeof progress === 'number' && (
          <span style={{
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan-light)',
            fontWeight: 600
          }}>
            {progress}% Completed
          </span>
        )}
      </div>
    </div>
  );
};
