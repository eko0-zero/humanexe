import React, { useState, useEffect } from "react";

const Menu = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const linkClass =
    "font-host relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:italic cursor-pointer bg-transparent border-none text-inherit text-big-base font-light";

  return (
    <>
      <nav
        id="menu"
        className={`fixed top-0 left-0 w-screen h-screen backdrop-blur-[6px] bg-white/70 p-5 text-black font-sans z-300 pointer-events-auto flex flex-col items-center justify-center gap-[12vh] text-big-base font-light ${
          open ? "block" : "hidden"
        }`}
      >
        <button onClick={() => onNavigate("app")} className={linkClass}>
          experience
        </button>

        <button onClick={() => onNavigate("explanation")} className={linkClass}>
          explanation
        </button>

        <button onClick={() => onNavigate("intro")} className={linkClass}>
          restart
        </button>
      </nav>
    </>
  );
};

export default Menu;
