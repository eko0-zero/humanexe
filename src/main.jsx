import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Introduction from "./Introduction.jsx";
import App from "./App.jsx";
import Explanation from "./Explanation.jsx";
import Statistic from "./Statistics.jsx";

function Root() {
  const [phase, setPhase] = useState("intro");

  const navigateTo = (page) => {
    setPhase("fading");
    setTimeout(() => setPhase(page), 600);
  };

  const handleEnter = () => navigateTo("app");

  if (phase === "app") return <App onNavigate={navigateTo} />;

  if (phase === "explanation") return <Explanation onNavigate={navigateTo} />;
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
