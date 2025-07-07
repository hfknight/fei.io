// src/components/ParticleBackground/ParticleBackground.tsx
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const ParticleCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
`;

// Extract Particle class outside component for better organization
class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 4 + 1;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.opacity = Math.random() * 0.3 + 0.1;

    // Random colors from theme palette
    const colors = ['#2563eb', '#06b6d4', '#64748b'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(width: number, height: number) {
    this.x += this.speedX;
    this.y += this.speedY;

    // Wrap around edges
    if (this.x > width) this.x = 0;
    if (this.x < 0) this.x = width;
    if (this.y > height) this.y = 0;
    if (this.y < 0) this.y = height;

    // Subtle opacity pulsing
    this.opacity += (Math.random() - 0.5) * 0.01;
    this.opacity = Math.max(0.05, Math.min(0.4, this.opacity));
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Animation utility functions
const createParticles = (width: number, height: number, count: number): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(width, height));
  }
  return particles;
};

const drawConnections = (
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  maxDistance: number = 120
) => {
  particles.forEach((particle, i) => {
    particles.slice(i + 1).forEach(otherParticle => {
      const dx = particle.x - otherParticle.x;
      const dy = particle.y - otherParticle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance) {
        ctx.save();
        ctx.globalAlpha = (maxDistance - distance) / maxDistance * 0.1;
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(otherParticle.x, otherParticle.y);
        ctx.stroke();
        ctx.restore();
      }
    });
  });
};

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Animation setup
    let particles: Particle[] = [];
    let animationId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      canvas.style.width = canvas.offsetWidth + 'px';
      canvas.style.height = canvas.offsetHeight + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Create particles based on screen size
      const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
      particles = createParticles(canvas.offsetWidth, canvas.offsetHeight, particleCount);
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update(canvas.offsetWidth, canvas.offsetHeight);
        particle.draw(ctx);
      });

      // Draw connections between nearby particles
      drawConnections(ctx, particles);

      animationId = requestAnimationFrame(animate);
    };

    // Initialize
    resize();
    animate();

    // Event listeners
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <ParticleCanvas ref={canvasRef} />;
};

export default ParticleBackground;