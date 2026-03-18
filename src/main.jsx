import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Introduction from "./Introduction.jsx";
import App from "./App.jsx";

function Root() {
  const [phase, setPhase] = useState("intro");

  const handleEnter = () => {
    setPhase("fading");
    setTimeout(() => setPhase("app"), 600);
  };

  if (phase === "app") return <App />;

  return (
    <div
      style={{
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <Introduction onEnter={handleEnter} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
