const BackgroundBeams = ({ className }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute top-0 -left-4 w-3/4 h-full bg-gradient-to-r from-indigo-500 to-transparent opacity-30 blur-3xl transform -skew-x-12"></div>
      <div className="absolute bottom-0 -right-4 w-3/4 h-full bg-gradient-to-l from-blue-500 to-transparent opacity-30 blur-3xl transform skew-x-12"></div>
    </div>
  );
};

export default BackgroundBeams;
