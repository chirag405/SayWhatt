// import { useState } from "react";
// import { motion } from "framer-motion";

// export const CardContainer = ({
//   children,
//   className = "",
//   perspective = 1000,
// }) => {
//   return (
//     <div
//       className={`group perspective ${className}`}
//       style={{ perspective: `${perspective}px` }}
//     >
//       {children}
//     </div>
//   );
// };

// export const CardBody = ({ children, className }) => {
//   const [rotateX, setRotateX] = useState(0);
//   const [rotateY, setRotateY] = useState(0);

//   const handleMouseMove = (e) => {
//     const card = e.currentTarget;
//     const rect = card.getBoundingClientRect();
//     const cardWidth = rect.width;
//     const cardHeight = rect.height;
//     const centerX = rect.left + cardWidth / 2;
//     const centerY = rect.top + cardHeight / 2;
//     const mouseX = e.clientX - centerX;
//     const mouseY = e.clientY - centerY;
//     const rotateXFactor = 5;
//     const rotateYFactor = 5;
//     const newRotateX = (mouseY / (cardHeight / 2)) * rotateXFactor;
//     const newRotateY = (mouseX / (cardWidth / 2)) * rotateYFactor;

//     setRotateX(-newRotateX);
//     setRotateY(newRotateY);
//   };

//   const handleMouseLeave = () => {
//     setRotateX(0);
//     setRotateY(0);
//   };

//   return (
//     <div
//       className={`transform-style-3d transition-transform duration-200 ${className || ""}`}
//       onMouseMove={handleMouseMove}
//       onMouseLeave={handleMouseLeave}
//       style={{
//         transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`,
//         transition: "all 0.2s ease",
//       }}
//     >
//       {children}
//     </div>
//   );
// };

// export const CardItem = ({
//   children,
//   className,
//   translateZ = 0,
//   rotateX = 0,
//   rotateY = 0,
//   rotateZ = 0,
//   translateX = 0,
//   translateY = 0,
//   as,
//   ...props
// }) => {
//   // Extract motion-specific props to avoid passing them to regular DOM elements
//   const {
//     whileHover,
//     animate,
//     initial,
//     transition,
//     variants,
//     exit,
//     whileTap,
//     whileFocus,
//     whileDrag,
//     whileInView,
//     ...restProps
//   } = props;

//   // Collect motion props only if they exist
//   const motionProps = {};
//   if (whileHover) motionProps.whileHover = whileHover;
//   if (animate) motionProps.animate = animate;
//   if (initial) motionProps.initial = initial;
//   if (transition) motionProps.transition = transition;
//   if (variants) motionProps.variants = variants;
//   if (exit) motionProps.exit = exit;
//   if (whileTap) motionProps.whileTap = whileTap;
//   if (whileFocus) motionProps.whileFocus = whileFocus;
//   if (whileDrag) motionProps.whileDrag = whileDrag;
//   if (whileInView) motionProps.whileInView = whileInView;

//   // Check if we need a motion component
//   const hasMotionProps = Object.keys(motionProps).length > 0;

//   // Common style for both components
//   const commonStyle = {
//     transform: `translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translateX(${translateX}px) translateY(${translateY}px)`,
//   };

//   // If we need a motion component
//   if (hasMotionProps) {
//     return (
//       <motion.div
//         className={`transform-style-3d ${className || ""}`}
//         style={commonStyle}
//         {...motionProps}
//         {...restProps}
//       >
//         {children}
//       </motion.div>
//     );
//   }

//   // Otherwise use the specified component or div
//   const Component = as || "div";
//   return (
//     <Component
//       className={`transform-style-3d ${className || ""}`}
//       style={commonStyle}
//       {...restProps}
//     >
//       {children}
//     </Component>
//   );
// };
