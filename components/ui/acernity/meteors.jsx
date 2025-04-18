import { useEffect, useState } from "react";

const Meteors = ({ number }) => {
  const [meteors, setMeteors] = useState([]);

  useEffect(() => {
    const generatedMeteors = [...Array(number)].map((_, i) => ({
      id: i,
      top: Math.floor(Math.random() * 100),
      left: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 8) + 2,
    }));
    setMeteors(generatedMeteors);
  }, [number]);

  return (
    <>
      {meteors.map((meteor) => (
        <div
          key={meteor.id}
          className="absolute w-1 h-1 bg-white rounded-full animate-meteor z-0"
          style={{
            top: `${meteor.top}%`,
            left: `${meteor.left}%`,
            animationDuration: `${meteor.duration}s`,
            opacity: 0.3,
          }}
        />
      ))}
    </>
  );
};

export default Meteors;
