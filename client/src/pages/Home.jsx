import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  return (
    // Div container for the home page with a background color, centered content, and some padding
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start pt-20 gap-6">
      {/* Title and description */}
      <h1 className="text-6xl font-bold text-orange-200">Code Chamber</h1>
      <p className="text-xl text-gray-100 font-medium">
        Multiplayer elimination coding game
      </p>
      {/* 2 Button cards */}
      <div className="flex justify-center pt-22 gap-48">
        {/* First Button to create room */}
        <button
          className="bg-orange-100 cursor-pointer hover:bg-orange-200 text-gray-800 text-3xl font-bold py-50 px-20 rounded"
          onClick={() => navigate("/create")}
        >
          Create Room
        </button>

        {/* Second Button to Join room */}
        <button
          className="bg-gray-700 cursor-pointer hover:bg-gray-600 text-white text-3xl font-bold py-50 px-20 rounded"
          onClick={() => navigate("/join")}
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default Home;
