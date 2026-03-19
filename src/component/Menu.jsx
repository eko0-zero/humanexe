import React from "react";

const Menu = ({ open }) => {
  if (!open) return null;

  return (
    <nav
      className="fixed top-0 left-0 w-screen h-screen backdrop-blur-[6px] bg-white/70 p-5 text-black font-sans z-300 pointer-events-auto flex flex-col
    items-center justify-center gap-[12vh] text-big-base font-light "
    >
      <a
        href="./app"
        className="font-host relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:italic"
      >
        experience
      </a>

      <a
        href="/Explanation"
        className="ffont-host relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:italic"
      >
        explanation
      </a>

      <a
        href="/introduction"
        className="font-host relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:italic"
      >
        restart
      </a>
    </nav>
  );
};

export default Menu;
