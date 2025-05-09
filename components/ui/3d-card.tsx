"use client";

import { cn } from "@/lib/utils";

import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from "react";

const MouseEnterContext = createContext<
  [boolean, React.Dispatch<React.SetStateAction<boolean>>] | undefined
>(undefined);

export const CardContainer = ({
  children,
  className,
  containerClassName,
  perspective = 1000,
  rotationIntensity = 3, // Reduced from 15 to 3 for more subtle movement
  glareIntensity = 0.2, // New prop for glare effect intensity
  rotationEnabled = true, // New prop to enable/disable rotation
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  perspective?: number;
  rotationIntensity?: number;
  glareIntensity?: number;
  rotationEnabled?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !rotationEnabled) return;
    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();

    // Calculate rotation based on mouse position
    const x =
      ((e.clientX - left - width / 2) / (width / 2)) * rotationIntensity;
    const y =
      ((e.clientY - top - height / 2) / (height / 2)) * -rotationIntensity;

    // Apply smooth rotation transform
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;

    // Update glare effect if enabled
    if (glareRef.current && glareIntensity > 0) {
      // Position the glare based on mouse movement
      const glareX = ((e.clientX - left) / width) * 100;
      const glareY = ((e.clientY - top) / height) * 100;
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, ${glareIntensity}), transparent)`;
    }
  };

  const handleMouseEnter = () => {
    setIsMouseEntered(true);
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    setIsMouseEntered(false);

    // Reset transform with transition
    containerRef.current.style.transform = `rotateY(0deg) rotateX(0deg)`;

    // Reset glare effect
    if (glareRef.current) {
      glareRef.current.style.background = "transparent";
    }
  };

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={cn(
          "py-8 flex items-center justify-center", // Reduced padding
          containerClassName
        )}
        style={{
          perspective: `${perspective}px`,
        }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "flex items-center justify-center relative transition-all duration-200 ease-out will-change-transform",
            className
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {glareIntensity > 0 && (
            <div
              ref={glareRef}
              className="absolute inset-0 z-10 pointer-events-none rounded-xl"
              style={{
                mixBlendMode: "overlay",
              }}
            />
          )}
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({
  children,
  className,
  shadow = true, // New prop for shadow effect
}: {
  children: React.ReactNode;
  className?: string;
  shadow?: boolean;
}) => {
  return (
    <div
      className={cn(
        "h-auto w-auto [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        shadow && "shadow-lg", // Add shadow if enabled
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  scaleEffect = true, // New prop for hover scale effect
  // Filter out Framer Motion specific props that shouldn't be passed to DOM elements
  whileHover,
  whileTap,
  ...rest
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  scaleEffect?: boolean;
  whileHover?: any; // Accept but don't pass this prop to DOM elements
  whileTap?: any; // Accept but don't pass this prop to DOM elements
  [key: string]: any;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isMouseEntered] = useMouseEnter();

  useEffect(() => {
    handleAnimations();
  }, [isMouseEntered]);

  const handleAnimations = () => {
    if (!ref.current) return;
    if (isMouseEntered) {
      // Apply 3D transform and subtle scaling effect when mouse enters parent
      const scale = scaleEffect ? "scale(1.05)" : "scale(1)";
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) ${scale}`;
      ref.current.style.filter = "brightness(1.05)"; // Subtle brightness increase
    } else {
      // Reset transform when mouse leaves
      ref.current.style.transform = `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
      ref.current.style.filter = "brightness(1)";
    }
  };

  return (
    <Tag
      ref={ref}
      className={cn("w-fit transition-all duration-300 ease-out", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
};

// Create a hook to use the context
export const useMouseEnter = () => {
  const context = useContext(MouseEnterContext);
  if (context === undefined) {
    // Return a default value instead of throwing an error
    return [false, () => {}] as [
      boolean,
      React.Dispatch<React.SetStateAction<boolean>>,
    ];
  }
  return context;
};
