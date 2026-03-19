import React from "react";

const Menu = ({ open, onNavigate }) => {
  if (!open) return null;

  const linkClass =
    "font-host relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:italic cursor-pointer bg-transparent border-none text-inherit text-big-base font-light";

  return (
    <nav
      className="fixed top-0 left-0 w-screen h-screen backdrop-blur-[6px] bg-white/70 p-5 text-black font-sans z-300 pointer-events-auto flex flex-col
    items-center justify-center gap-[12vh] text-big-base font-light "
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
  );
};

export default Menu;
