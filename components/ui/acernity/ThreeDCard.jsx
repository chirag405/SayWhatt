import { useState } from "react";

export const CardContainer = ({ children, className }) => {
  return <div className={`group perspective ${className}`}>{children}</div>;
};

export const CardBody = ({ children, className }) => {
  const [rotateX, setRotateX] = useState(0); // Changed from useInternalState to useState
  const [rotateY, setRotateY] = useState(0); // Changed from useInternalState to useState

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const cardWidth = rect.width;
    const cardHeight = rect.height;
    const centerX = rect.left + cardWidth / 2;
    const centerY = rect.top + cardHeight / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    const rotateXFactor = 5;
    const rotateYFactor = 5;
    const newRotateX = (mouseY / (cardHeight / 2)) * rotateXFactor;
    const newRotateY = (mouseX / (cardWidth / 2)) * rotateYFactor;

    setRotateX(-newRotateX);
    setRotateY(newRotateY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      className={`transform-style-3d transition-transform duration-200 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`,
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </div>
  );
};

export const CardItem = ({ children, className, translateZ = 0 }) => {
  return (
    <div
      className={`transform-style-3d ${className}`}
      style={{
        transform: `translateZ(${translateZ}px)`,
      }}
    >
      {children}
    </div>
  );
};
