import React from 'react';

interface ThemeLiquidLoaderProps {
  statusText?: string;
  subText?: string;
  progress?: number;
  width?: string | number;
  height?: string | number;
}

export const ThemeLiquidLoader: React.FC<ThemeLiquidLoaderProps> = ({
  statusText,
  subText,
  progress,
  width = '100%',
  height = 54
}) => {
  // If progress is not explicitly provided, try to extract percentage from subText (e.g. "45% Completed")
  const derivedProgress = React.useMemo(() => {
    if (typeof progress === 'number' && !isNaN(progress)) {
      return Math.min(100, Math.max(0, progress));
    }
    if (subText) {
      const match = subText.match(/(\d+)%/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 15;
  }, [progress, subText]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 9, 26, 0.65)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(49, 92, 255, 0.12)',
        padding: '12px 18px',
        userSelect: 'none',
        width: typeof width === 'number' ? `${width}px` : width,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background ambient liquid glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70%',
          height: '40px',
          background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.22) 0%, rgba(49, 92, 255, 0.12) 45%, transparent 75%)',
          filter: 'blur(12px)',
          pointerEvents: 'none'
        }}
      />

      {/* Main Liquid Flow Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height,
          borderRadius: '12px',
          background: 'rgba(8, 15, 38, 0.9)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.8), 0 0 16px rgba(56, 189, 248, 0.2)'
        }}
      >
        {/* Dynamic Fluid Fill Level */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${Math.max(10, derivedProgress)}%`,
            background: 'linear-gradient(90deg, rgba(30, 64, 175, 0.35) 0%, rgba(49, 92, 255, 0.5) 60%, rgba(56, 189, 248, 0.65) 100%)',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            borderRight: '2px solid rgba(56, 189, 248, 0.9)',
            boxShadow: '0 0 18px rgba(56, 189, 248, 0.6)'
          }}
        />

        {/* Liquid Waves SVG Layer */}
        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200%',
            height: '100%',
            opacity: 0.85,
            animation: 'liquidWaveSlide 3.2s linear infinite'
          }}
        >
          <defs>
            <linearGradient id="liquidCyanGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#315cff" stopOpacity="0.4" />
              <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#315cff" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="liquidCyanGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Deep fluid wave */}
          <path
            d="M 0,50 Q 125,20 250,50 T 500,50 T 750,50 T 1000,50 L 1000,100 L 0,100 Z"
            fill="url(#liquidCyanGrad1)"
          />
          {/* Surface crest wave */}
          <path
            d="M 0,60 Q 125,85 250,60 T 500,60 T 750,60 T 1000,60 L 1000,100 L 0,100 Z"
            fill="url(#liquidCyanGrad2)"
          />
        </svg>

        {/* Counter-flow undulating wave layer */}
        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200%',
            height: '100%',
            opacity: 0.6,
            animation: 'liquidWaveSlideReverse 4.8s linear infinite'
          }}
        >
          <path
            d="M 0,45 Q 125,75 250,45 T 500,45 T 750,45 T 1000,45 L 1000,100 L 0,100 Z"
            fill="url(#liquidCyanGrad2)"
          />
        </svg>

        {/* Floating Liquid Bubbles */}
        <div className="liquid-bubble bubble-1" />
        <div className="liquid-bubble bubble-2" />
        <div className="liquid-bubble bubble-3" />
        <div className="liquid-bubble bubble-4" />
        <div className="liquid-bubble bubble-5" />

        {/* Sweeping Laser Coordinate Analysis Beam */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '120px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.4) 40%, rgba(255, 255, 255, 0.85) 50%, rgba(56, 189, 248, 0.4) 60%, transparent 100%)',
            animation: 'laserScanSweep 2.2s ease-in-out infinite alternate',
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            filter: 'drop-shadow(0 0 8px #38bdf8)'
          }}
        />

        {/* Top glossy liquid surface reflection */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '35%',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Status Text & Progress Subtext */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          marginTop: '10px',
          zIndex: 1
        }}
      >
        {statusText && (
          <span
            style={{
              fontSize: '0.86rem',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
              letterSpacing: '0.02em',
              textAlign: 'center',
              textShadow: '0 0 12px rgba(56, 189, 248, 0.35)'
            }}
          >
            {statusText}
          </span>
        )}

        {subText && (
          <span
            style={{
              fontSize: '0.80rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: '#38bdf8',
              letterSpacing: '0.04em',
              textAlign: 'center',
              textShadow: '0 0 14px rgba(56, 189, 248, 0.55)'
            }}
          >
            {subText}
          </span>
        )}
      </div>

      {/* Embedded CSS for 60fps GPU Hardware-Accelerated Animations */}
      <style>{`
        @keyframes liquidWaveSlide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes liquidWaveSlideReverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes laserScanSweep {
          0% { transform: translateX(-80px); }
          100% { transform: translateX(calc(100% + 80px)); }
        }
        .liquid-bubble {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff 0%, #38bdf8 60%, rgba(49, 92, 255, 0.8) 100%);
          box-shadow: 0 0 8px rgba(56, 189, 248, 0.7);
          pointer-events: none;
        }
        .bubble-1 {
          width: 8px;
          height: 8px;
          left: 18%;
          bottom: 15%;
          animation: bubbleRise 2.8s ease-in-out infinite;
        }
        .bubble-2 {
          width: 12px;
          height: 12px;
          left: 36%;
          bottom: 10%;
          animation: bubbleRise 3.4s ease-in-out infinite 0.7s;
        }
        .bubble-3 {
          width: 6px;
          height: 6px;
          left: 54%;
          bottom: 20%;
          animation: bubbleRise 2.4s ease-in-out infinite 1.2s;
        }
        .bubble-4 {
          width: 10px;
          height: 10px;
          left: 72%;
          bottom: 12%;
          animation: bubbleRise 3.1s ease-in-out infinite 0.4s;
        }
        .bubble-5 {
          width: 7px;
          height: 7px;
          left: 88%;
          bottom: 18%;
          animation: bubbleRise 2.6s ease-in-out infinite 1.6s;
        }
        @keyframes bubbleRise {
          0% {
            transform: translateY(12px) scale(0.8);
            opacity: 0.2;
          }
          50% {
            opacity: 0.9;
            transform: translateY(-8px) scale(1.1);
          }
          100% {
            transform: translateY(-26px) scale(0.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ThemeLiquidLoader;
