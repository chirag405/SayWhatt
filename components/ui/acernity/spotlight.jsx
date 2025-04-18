const Spotlight = ({ className, fill }) => {
  return (
    <div className={`absolute h-96 w-96 ${className}`}>
      <div
        className={`absolute inset-0 rounded-full blur-3xl bg-${fill || "blue"}-600 opacity-20`}
      ></div>
    </div>
  );
};

export default Spotlight;
