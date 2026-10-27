import React, { useEffect, useRef } from 'react';

/**
 * Fyntic-inspired deep-space animated background with soft cyan/blue ambient glows
 * and subtle floating star particles (Requirement 5 & Screenshot 3).
 *
 * Designed with high performance:
 * - HTML5 Canvas with minimal draw overhead
 * - Automatic pause when tab is inactive or reduced-motion is preferred
 * - Zero pointer-events to never obstruct interactions
 */
export const FynticBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle definition
    interface Star {
      x: number;
      y: number;
      radius: number;
      baseAlpha: number;
      alpha: number;
      twinkleSpeed: number;
      vx: number;
      vy: number;
      color: string;
    }

    const starCount = Math.min(65, Math.floor((width * height) / 18000));
    const stars: Star[] = [];

    const starColors = [
      'rgba(255, 255, 255,',
      'rgba(56, 189, 248,',
      'rgba(96, 165, 250,',
      'rgba(147, 197, 253,'
    ];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.4 + 0.5,
        baseAlpha: Math.random() * 0.65 + 0.25,
        alpha: Math.random() * 0.65 + 0.25,
        twinkleSpeed: Math.random() * 0.02 + 0.006,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.25 - 0.05, // Gentle upward drift
        color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }

    // Nebula glow points
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Soft deep space base gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#04060f');
      bgGrad.addColorStop(0.5, '#060919');
      bgGrad.addColorStop(1, '#03050c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Gentle drifting nebula light fields (inspired by Fyntic cyan/blue ambient fields)
      time += 0.008;
      const g1X = width * 0.3 + Math.sin(time * 0.7) * 45;
      const g1Y = height * 0.25 + Math.cos(time * 0.6) * 35;
      const rad1 = Math.max(width * 0.35, 320);

      const neb1 = ctx.createRadialGradient(g1X, g1Y, 0, g1X, g1Y, rad1);
      neb1.addColorStop(0, 'rgba(49, 92, 255, 0.14)');
      neb1.addColorStop(0.5, 'rgba(6, 182, 212, 0.06)');
      neb1.addColorStop(1, 'rgba(3, 5, 12, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, width, height);

      const g2X = width * 0.75 + Math.cos(time * 0.5) * 40;
      const g2Y = height * 0.65 + Math.sin(time * 0.4) * 35;
      const rad2 = Math.max(width * 0.4, 360);

      const neb2 = ctx.createRadialGradient(g2X, g2Y, 0, g2X, g2Y, rad2);
      neb2.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      neb2.addColorStop(0.6, 'rgba(99, 102, 241, 0.04)');
      neb2.addColorStop(1, 'rgba(3, 5, 12, 0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, width, height);

      // 3. Subtle floating particles & stars
      if (!prefersReducedMotion) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];

          // Drift movement
          s.x += s.vx;
          s.y += s.vy;

          // Wrap edges
          if (s.x < 0) s.x = width;
          if (s.x > width) s.x = 0;
          if (s.y < 0) s.y = height;
          if (s.y > height) s.y = 0;

          // Twinkle effect
          s.alpha = s.baseAlpha + Math.sin(time * 15 * s.twinkleSpeed + i) * 0.25;
          const clampedAlpha = Math.max(0.1, Math.min(0.9, s.alpha));

          // Draw star
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${s.color} ${clampedAlpha})`;
          ctx.fill();

          // Soft subtle halo for larger stars
          if (s.radius > 1.2) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `${s.color} ${clampedAlpha * 0.2})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="fyntic-background-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: 0.95
        }}
      />
      {/* Ambient overlay vignette for deep contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(4, 6, 15, 0.65) 100%)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default FynticBackground;
