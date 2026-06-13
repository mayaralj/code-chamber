const GameNavbar = ({ onSubmit }) => {
  return (
    <div className="w-full bg-gray-900 py-3 flex justify-center items-center">
      <button
        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer"
        onClick={onSubmit}
      >
        Submit
      </button>
    </div>
  );
};

export default GameNavbar;
