// components/ui/GamifiedTitle.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';

interface GamifiedTitleProps {
  title: string;
}

const GamifiedTitle: React.FC<GamifiedTitleProps> = ({ title }) => {
  const [activated, setActivated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the main container

  const createParticle = useCallback(() => {
    if (!containerRef.current) return;

    const particle = document.createElement('div');
    particle.classList.add('particle'); // Base particle class from CSS

    // Add 'odd' class randomly for color variation
    if (Math.random() > 0.5) {
      particle.classList.add('odd');
    }

    const size = Math.random() * 6 + 2; // Tailwind: w-[2px]-w-[8px], h-[2px]-h-[8px]
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Position particles relative to the containerRef, spreading them more widely
    const containerWidth = containerRef.current.offsetWidth;
    // const containerHeight = containerRef.current.offsetHeight; // Or window.innerHeight for full viewport spread

    // Allow particles to start from outside the immediate title area for a better effect
    particle.style.left = `${Math.random() * (containerWidth * 1.5) - (containerWidth * 0.25)}px`; // Spread wider than container

    // particle.style.setProperty('--particle-tx', `${Math.random() * 200 - 100}px`); // For varied horizontal movement
    // particle.style.setProperty('--particle-scale', `${Math.random() * 0.5 + 0.5}`); // For varied scale

    // Ensure particles are appended to the container so they are positioned correctly within it
    containerRef.current.appendChild(particle);
    
    // Animation delay and duration are handled by CSS, but specific properties can be set here
    particle.style.animationDelay = `${Math.random() * 6}s`;


    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 8000); // Corresponds to max animation duration (particleFloat 6s or 8s + delay)
  }, []);

  useEffect(() => {
    const initialParticles = 5; // Number of particles to create on mount
    for (let i = 0; i < initialParticles; i++) {
      setTimeout(createParticle, i * 200);
    }

    const intervalId = setInterval(createParticle, 300); // Create new particles periodically

    return () => {
      clearInterval(intervalId);
      // Clean up any remaining particles if component unmounts
      if (containerRef.current) {
        const particles = containerRef.current.querySelectorAll('.particle');
        particles.forEach(p => p.remove());
      }
    };
  }, [createParticle]);

  const handleClick = () => {
    setActivated(true);
    setTimeout(() => {
      setActivated(false);
    }, 600);
  };

  return (
    <div ref={containerRef} className="game-title-container my-6 relative">
      <div className="game-decorations">
        <div className="corner-accent"></div>
        <div className="corner-accent"></div>
        <div className="corner-accent"></div>
        <div className="corner-accent"></div>
        <div className="scan-lines"></div>
      </div>
      <div className="game-title-glow"></div>
      <h1
        className={`game-title font-orbitron text-[clamp(3rem,8vw,7rem)] md:text-[clamp(3rem,8vw,8rem)] font-black tracking-wider text-center relative cursor-pointer select-none
                   bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500 bg-clip-text text-transparent 
                   bg-[length:400%_400%] animate-gradientShift animate-floatTitle
                   ${activated ? 'activated' : ''}`}
        id="gameTitle"
        onClick={handleClick}
      >
        {title}
      </h1>
      {/* Particles are appended to containerRef by createParticle function */}
    </div>
  );
};

export default GamifiedTitle;
