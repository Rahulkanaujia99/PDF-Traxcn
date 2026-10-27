import React, { useEffect, useRef } from 'react';

/**
 * Fyntic-inspired 3D Space Warp Particle Engine (https://fyntic.webflow.io/)
 * Features:
 * - Immersive 3D space travel motion: particles move toward the viewer with varying speed, depth, size, and brightness
 * - Smooth forward warp streaks / velocity trails for nearby stars
 * - Prominent, soft blue / cyan ambient glow near the center
 * - Full-viewport fixed positioning without clipping or restriction
 * - Accessible: respects prefers-reduced-motion
 */
export const FynticBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 3D Star Definition
    interface Star3D {
      x: number;
      y: number;
      z: number;
      pz: number;
      baseRadius: number;
      speed: number;
      color: string;
      isGlowStar: boolean;
    }

    const MAX_Z = 1200;
    const FOV = 340;
    const starCount = Math.min(320, Math.max(160, Math.floor((window.innerWidth * window.innerHeight) / 5800)));
    const stars: Star3D[] = [];

    const starColors = [
      'rgba(255, 255, 255,',
      'rgba(56, 189, 248,',
      'rgba(125, 211, 252,',
      'rgba(186, 230, 253,',
      'rgba(165, 180, 252,'
    ];

    const initStar = (star?: Star3D, forceFar = false): Star3D => {
      const spreadX = Math.max(window.innerWidth * 1.4, 1200);
      const spreadY = Math.max(window.innerHeight * 1.4, 900);
      const z = forceFar ? MAX_Z : Math.random() * MAX_Z + 1;
      const isGlow = Math.random() < 0.28;

      const newStar: Star3D = {
        x: (Math.random() - 0.5) * spreadX,
        y: (Math.random() - 0.5) * spreadY,
        z,
        pz: z,
        baseRadius: isGlow ? Math.random() * 1.3 + 1.2 : Math.random() * 0.9 + 0.6,
        speed: Math.random() * 4.5 + 2.5,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        isGlowStar: isGlow
      };

      if (star) {
        Object.assign(star, newStar);
        return star;
      }
      return newStar;
    };

    for (let i = 0; i < starCount; i++) {
      stars.push(initStar(undefined, false));
    }

    let time = 0;

    const render = () => {
      time += 0.012;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep space base background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#030612');
      bgGrad.addColorStop(0.38, '#050a1d');
      bgGrad.addColorStop(0.72, '#040716');
      bgGrad.addColorStop(1, '#02040b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Prominent, pulsing soft blue / cyan ambient glow near center (Fyntic signature)
      const centerX = width * 0.5 + Math.sin(time * 0.35) * 18;
      const centerY = height * 0.42 + Math.cos(time * 0.3) * 14;

      const pulseFactor = 1 + Math.sin(time * 0.75) * 0.08;
      const coreRadius = Math.max(width * 0.36, 420) * pulseFactor;

      // Cyan Core Nebula
      const cyanCore = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      cyanCore.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
      cyanCore.addColorStop(0.32, 'rgba(56, 189, 248, 0.18)');
      cyanCore.addColorStop(0.65, 'rgba(49, 92, 255, 0.08)');
      cyanCore.addColorStop(1, 'rgba(3, 6, 18, 0)');
      ctx.fillStyle = cyanCore;
      ctx.fillRect(0, 0, width, height);

      // Broad Deep Blue & Indigo Aura
      const auraRadius = Math.max(width * 0.65, 780);
      const blueAura = ctx.createRadialGradient(centerX, centerY * 1.05, 0, centerX, centerY * 1.05, auraRadius);
      blueAura.addColorStop(0, 'rgba(49, 92, 255, 0.22)');
      blueAura.addColorStop(0.48, 'rgba(99, 102, 241, 0.10)');
      blueAura.addColorStop(0.82, 'rgba(6, 182, 212, 0.03)');
      blueAura.addColorStop(1, 'rgba(2, 4, 11, 0)');
      ctx.fillStyle = blueAura;
      ctx.fillRect(0, 0, width, height);

      // 3. Render 3D Space Warp Particles (traveling toward viewer)
      if (!prefersReducedMotion) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];

          s.pz = s.z;
          s.z -= s.speed;

          // If passed camera or out of bounds, reset star to far distance
          if (s.z <= 2) {
            initStar(s, true);
            continue;
          }

          // Project 3D coordinates onto 2D screen
          const k = FOV / s.z;
          const sx = centerX + s.x * k;
          const sy = centerY + s.y * k;

          // Project previous position for motion trail
          const pk = FOV / s.pz;
          const px = centerX + s.x * pk;
          const py = centerY + s.y * pk;

          // Screen boundary check
          if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) {
            initStar(s, true);
            continue;
          }

          // Depth progression factor: 0 (far) -> 1 (near viewer)
          const depthRatio = Math.max(0, Math.min(1, 1 - s.z / MAX_Z));
          const currentRadius = s.baseRadius * (0.65 + depthRatio * 2.2);
          const currentAlpha = Math.max(0.18, Math.min(1.0, 0.2 + depthRatio * 0.8));

          // A. Draw velocity streak for particles moving fast toward the viewer
          if (depthRatio > 0.18) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = `${s.color} ${currentAlpha * 0.45})`;
            ctx.lineWidth = Math.max(0.6, currentRadius * 0.7);
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          // B. Draw star head
          if (s.isGlowStar) {
            // Soft outer cyan glowing halo
            ctx.beginPath();
            ctx.arc(sx, sy, currentRadius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha * 0.32})`;
            ctx.fill();

            // Crisp radiant star center
            ctx.beginPath();
            ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
            ctx.fill();
          } else {
            // Standard celestial node
            ctx.beginPath();
            ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = `${s.color} ${currentAlpha})`;
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
