import React from "react";

const Menu = ({ open }) => {
  if (!open) return null; // Ne rien afficher si fermé

  return (
    <nav className="fixed top-0 left-0 w-screen h-screen backdrop-blur-[6px] bg-white/70 p-5 text-black font-sans z-300 pointer-envents-auto">
      <div className="my-2 text-lg font-bold hover:text-gray-300 cursor-pointer">
        Catégorie 1
      </div>
      <div className="my-2 text-lg font-bold hover:text-gray-300 cursor-pointer">
        Catégorie 2
      </div>
      <div className="my-2 text-lg font-bold hover:text-gray-300 cursor-pointer">
        Catégorie 3
      </div>
    </nav>
  );
};

export default Menu;
