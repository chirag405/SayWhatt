const GamingIllustration = ({ className }) => {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20,50 Q50,10 80,50 T140,50 T180,50"
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
        />
        <circle cx="50" cy="50" r="10" fill="#8b5cf6" />
        <circle cx="100" cy="50" r="15" fill="#3b82f6" />
        <circle cx="150" cy="50" r="12" fill="#10b981" />

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default GamingIllustration;
