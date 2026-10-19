import React, { useEffect, useRef } from 'react';

export const ConduitBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Particle wave simulation
    const rows = 32;
    const cols = 55;

    const render = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const horizonY = height * 0.42;

      // Draw subtle ambient glow
      const radialGlow = ctx.createRadialGradient(
        centerX, horizonY, 20,
        centerX, horizonY, width * 0.55
      );
      radialGlow.addColorStop(0, 'rgba(49, 92, 255, 0.14)');
      radialGlow.addColorStop(0.45, 'rgba(99, 102, 241, 0.05)');
      radialGlow.addColorStop(1, 'rgba(5, 8, 23, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Render undulating wave particles
      for (let r = 0; r < rows; r++) {
        // Depth from 0 (horizon/far) to 1 (near)
        const depth = (r + 1) / rows;
        const scale = 0.25 + depth * 0.95;
        const yOffset = (r / rows) * (height - horizonY) * 1.1;

        const rowAlpha = Math.min(1, Math.max(0.08, depth * 0.65));

        for (let c = 0; c < cols; c++) {
          const xProgress = (c / (cols - 1)) - 0.5; // -0.5 to 0.5
          const worldX = xProgress * (width * 1.4);

          // Undulating wave height calculation
          const wave1 = Math.sin(xProgress * 8 + time * 1.2 + r * 0.2) * 22;
          const wave2 = Math.cos(xProgress * 4 - time * 0.8 + r * 0.3) * 14;
          const waveHeight = (wave1 + wave2) * depth;

          const screenX = centerX + worldX * scale;
          const screenY = horizonY + yOffset + waveHeight;

          if (screenX >= -10 && screenX <= width + 10 && screenY >= 0 && screenY <= height + 10) {
            const particleRadius = Math.max(1, depth * 2.2);

            ctx.beginPath();
            ctx.arc(screenX, screenY, particleRadius, 0, Math.PI * 2);

            // Shading: center particles are slightly more vibrant blue/violet
            const distFromCenter = Math.abs(xProgress);
            const centerFactor = Math.max(0, 1 - distFromCenter * 1.5);
            
            if (centerFactor > 0.4) {
              ctx.fillStyle = `rgba(112, 148, 255, ${rowAlpha * (0.5 + centerFactor * 0.5)})`;
            } else {
              ctx.fillStyle = `rgba(49, 92, 255, ${rowAlpha * 0.6})`;
            }

            ctx.fill();
          }
        }
      }

      if (!prefersReducedMotion) {
        time += 0.014;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.95
      }}
    />
  );
};
