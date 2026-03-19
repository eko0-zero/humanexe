import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Introduction from "./Introduction.jsx";
import App from "./App.jsx";
import Explanation from "./Explanation.jsx";

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

// import { StrictMode, useState } from "react";
// import { createRoot } from "react-dom/client";
// import "./index.css";
// import Explanation from "./Explanation.jsx"; // <-- Remplace Introduction par Explanation
// import App from "./App.jsx";

// function Root() {
//   const [phase, setPhase] = useState("explanation"); // <-- phase initiale adaptée

//   const handleEnter = () => {
//     setPhase("fading");
//     setTimeout(() => setPhase("app"), 600);
//   };

//   if (phase === "app") return <App />;

//   return (
//     <div
//       style={{
//         opacity: phase === "fading" ? 0 : 1,
//         transition: "opacity 0.6s ease",
//       }}
//     >
//       <Explanation onEnter={handleEnter} /> {/* <-- Affiche Explanation */}
//     </div>
//   );
// }

// createRoot(document.getElementById("root")).render(
//   <StrictMode>
//     <Root />
//   </StrictMode>,
// );
