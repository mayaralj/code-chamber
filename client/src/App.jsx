import { RouterProvider } from "react-router";
import router from "./router";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{
          top: 90,
          right: 40,
        }}
        toastOptions={{
          style: {
            background: "#080812",
            color: "#e8d9c0",
            border: "1px solid #4b4133",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            letterSpacing: "0.05em",
            width: "auto",
            height: "auto",
            padding: "10px",
          },
        }}
      />
      <RouterProvider router={router} />
    </>
  );
};

export default App;
