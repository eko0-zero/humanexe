import React from "react";

const Menu = ({ open }) => {
  if (!open) return null; // Ne rien afficher si fermé

  return (
    <nav className="fixed top-0 left-0 w-screen h-screen backdrop-blur-[6px] bg-white/70 p-5 text-black font-sans z-300 pointer-events-auto">
      <a
        href="/app"
        className="block my-2 text-lg font-bold hover:text-gray-300 cursor-pointer"
      >
        experience
      </a>

      <a
        href="/explanation"
        className="block my-2 text-lg font-bold hover:text-gray-300 cursor-pointer"
      >
        explanation
      </a>

      <a
        href="/introduction"
        className="block my-2 text-lg font-bold hover:text-gray-300 cursor-pointer"
      >
        restart
      </a>
    </nav>
  );
};

export default Menu;
