"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  hue: number;
  opacity: number;
}

interface CosmicParticlesBackgroundProps {
  particleCount?: number;
  connectionDistance?: number;
  particleColors?: string[];
  baseHue?: number;
  className?: string;
}

export const CosmicParticlesBackground = ({
  particleCount = 70,
  connectionDistance = 120,
  particleColors,
  baseHue = 260, // Purple base
  className = "",
}: CosmicParticlesBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);

  // Initialize on client side only
  useEffect(() => {
    setIsClient(true);
    setWindowSize({
      width: window.innerWidth,
      height: Math.max(window.innerHeight, document.body.scrollHeight),
    });
  }, []);

  // Handle resize and scroll events
  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: Math.max(window.innerHeight, document.body.scrollHeight),
      });
    };

    const handleScroll = () => {
      // Update canvas height if document grew
      if (canvasRef.current) {
        const newHeight = Math.max(
          window.innerHeight,
          document.body.scrollHeight
        );
        if (newHeight !== windowSize.height) {
          setWindowSize((prev) => ({
            ...prev,
            height: newHeight,
          }));
        }
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    // Call once to initialize
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isClient, windowSize.height]);

  // Initialize particles
  useEffect(() => {
    if (!isClient || !windowSize.width || !windowSize.height) return;

    particles.current = [];
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        x: Math.random() * windowSize.width,
        y: Math.random() * windowSize.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        hue: Math.random() * 60 + baseHue, // Limited to purple-blue range
        opacity: 0.2 + Math.random() * 0.5,
      });
    }
  }, [isClient, particleCount, windowSize, baseHue]);

  // Animation loop
  useEffect(() => {
    if (!isClient || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    canvas.width = windowSize.width;
    canvas.height = windowSize.height;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        p.x += p.speedX;
        p.y += p.speedY;

        // Bounce off edges
        if (p.x < 0 || p.x > windowSize.width) p.speedX *= -1;
        if (p.y < 0 || p.y > windowSize.height) p.speedY *= -1;

        // Draw particle
        ctx.beginPath();

        if (particleColors && particleColors.length > 0) {
          const colorIndex = Math.floor(p.hue % particleColors.length);
          ctx.fillStyle = particleColors[colorIndex];
        } else {
          ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`;
        }

        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.current.length; j++) {
          const p2 = particles.current[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            const opacity =
              (1 - distance / connectionDistance) *
              0.2 *
              p.opacity *
              p2.opacity;

            if (particleColors && particleColors.length > 0) {
              const colorIndex = Math.floor(
                ((p.hue + p2.hue) / 2) % particleColors.length
              );
              ctx.strokeStyle = particleColors[colorIndex]
                .replace(")", `, ${opacity})`)
                .replace("rgb", "rgba");
            } else {
              ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 70%, 60%, ${opacity})`;
            }

            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [isClient, particleColors, connectionDistance, windowSize]);

  if (!isClient) return null;

  return (
    <motion.canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full z-0 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: windowSize.height,
        pointerEvents: "none",
      }}
    />
  );
};
