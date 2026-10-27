import React, { useEffect, useRef } from 'react';

/**
 * Fyntic-inspired deep-space animated background (https://fyntic.webflow.io/)
 * Features:
 * - Full-viewport fixed positioning (position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0;)
 * - Prominent, pulsing soft blue/cyan ambient light glow around center
 * - High-density visible particles and glowing stars with realistic twinkle and smooth upward drift
 * - Completely behind all content (pointer-events: none)
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
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
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
      seed: number;
      color: string;
      isGlowStar: boolean;
    }

    // High particle density across full screen (both left & right sides)
    const starCount = Math.min(240, Math.max(140, Math.floor((width * height) / 9500)));
    const stars: Star[] = [];

    const starColors = [
      'rgba(255, 255, 255,',
      'rgba(56, 189, 248,',
      'rgba(125, 211, 252,',
      'rgba(96, 165, 250,',
      'rgba(165, 180, 252,'
    ];

    for (let i = 0; i < starCount; i++) {
      const isGlow = Math.random() < 0.28; // ~28% are prominent glowing stars
      const radius = isGlow ? Math.random() * 1.3 + 1.5 : Math.random() * 0.9 + 0.5;

      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        baseAlpha: isGlow ? Math.random() * 0.4 + 0.6 : Math.random() * 0.45 + 0.35,
        alpha: 0.5,
        twinkleSpeed: Math.random() * 0.025 + 0.008,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -Math.random() * 0.22 - 0.07, // Gentle, smooth upward drift
        seed: Math.random() * 100,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        isGlowStar: isGlow
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Deep space base gradient across full viewport
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#030611');
      bgGrad.addColorStop(0.38, '#05091a');
      bgGrad.addColorStop(0.75, '#040715');
      bgGrad.addColorStop(1, '#02040b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Prominent Fyntic-style soft blue/cyan ambient light glow around center
      time += 0.01;

      const centerX = width * 0.5 + Math.sin(time * 0.5) * 25;
      const centerY = Math.max(180, height * 0.38) + Math.cos(time * 0.4) * 20;

      // Core Cyan Glow (gently pulsing and shifting)
      const pulseFactor = 1 + Math.sin(time * 0.8) * 0.08;
      const coreRadius = Math.max(width * 0.32, 380) * pulseFactor;

      const cyanCore = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      cyanCore.addColorStop(0, 'rgba(6, 182, 212, 0.24)');
      cyanCore.addColorStop(0.32, 'rgba(56, 189, 248, 0.16)');
      cyanCore.addColorStop(0.65, 'rgba(49, 92, 255, 0.07)');
      cyanCore.addColorStop(1, 'rgba(3, 6, 17, 0)');

      ctx.fillStyle = cyanCore;
      ctx.fillRect(0, 0, width, height);

      // Electric Blue / Royal Aura (broad atmospheric glow covering both sides)
      const blueX = width * 0.52 + Math.cos(time * 0.3) * 35;
      const blueY = centerY * 1.05 + Math.sin(time * 0.35) * 20;
      const blueRadius = Math.max(width * 0.55, 600);

      const blueAura = ctx.createRadialGradient(blueX, blueY, 0, blueX, blueY, blueRadius);
      blueAura.addColorStop(0, 'rgba(49, 92, 255, 0.18)');
      blueAura.addColorStop(0.48, 'rgba(99, 102, 241, 0.08)');
      blueAura.addColorStop(0.85, 'rgba(6, 182, 212, 0.03)');
      blueAura.addColorStop(1, 'rgba(2, 4, 11, 0)');

      ctx.fillStyle = blueAura;
      ctx.fillRect(0, 0, width, height);

      // Secondary ambient glow on the right side behind the queue & cards
      const rightX = width * 0.78 + Math.sin(time * 0.3) * 30;
      const rightY = height * 0.62 + Math.cos(time * 0.25) * 25;
      const rightNebula = ctx.createRadialGradient(rightX, rightY, 0, rightX, rightY, width * 0.45);
      rightNebula.addColorStop(0, 'rgba(56, 189, 248, 0.10)');
      rightNebula.addColorStop(0.55, 'rgba(49, 92, 255, 0.04)');
      rightNebula.addColorStop(1, 'rgba(2, 4, 11, 0)');
      ctx.fillStyle = rightNebula;
      ctx.fillRect(0, 0, width, height);

      // 3. Render visible moving particles and glowing stars
      if (!prefersReducedMotion) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];

          // Smooth drift movement
          s.x += s.vx + Math.sin(time * 1.5 + s.seed) * 0.06;
          s.y += s.vy;

          // Seamless edge wrapping
          if (s.x < 0) s.x = width;
          if (s.x > width) s.x = 0;
          if (s.y < 0) {
            s.y = height + 4;
            s.x = Math.random() * width;
          }
          if (s.y > height + 4) s.y = 0;

          // Twinkle effect
          s.alpha = s.baseAlpha + Math.sin(time * 18 * s.twinkleSpeed + s.seed) * 0.28;
          const clampedAlpha = Math.max(0.18, Math.min(1.0, s.alpha));

          ctx.save();

          if (s.isGlowStar) {
            // Prominent glowing star with neon cyan halo (Fyntic style)
            ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${clampedAlpha})`;
            ctx.fill();

            // Soft outer halo ring
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${clampedAlpha * 0.25})`;
            ctx.fill();
          } else {
            // Crisp celestial midground & background star
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `${s.color} ${clampedAlpha})`;
            ctx.fill();
          }

          ctx.restore();
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
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
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default FynticBackground;
