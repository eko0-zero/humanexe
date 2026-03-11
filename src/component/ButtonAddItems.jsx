import { useRef, useCallback, useState, useEffect } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { Body, Box, Vec3, Material, ContactMaterial } from "cannon-es";

export default function ButtonAddItem() {
  const handleClick = () => {
    // Logique pour ajouter un nouvel item dans la scène
  };
  return (
    <button
      onClick={handleClick}
      className="absolute top-[15vh] left-5 hover:px-6 hover:py-3 z-10 font-host font-light text-[1.8rem] border-2 border-black rounded-[100px] px-5 py-2 flex items-center gap-3 transition-all bg-white"
    >
      <img src="/src/assets/img/svg/plus.svg" alt="Add" />
      <span>add item</span>
    </button>
  );
}
