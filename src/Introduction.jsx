import { useEffect, useRef } from "react";
import arrow from "./assets/img/svg/arrow.svg";
import gsap from "gsap";

export default function Introduction({ onEnter }) {
  useEffect(() => {
    const preventScroll = (e) => e.preventDefault();

    // Bloquer scroll souris, touch et clavier
    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", (e) => {
      const keys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "PageUp",
        "PageDown",
        "Space",
      ];
      if (keys.includes(e.code)) e.preventDefault();
    });

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  useEffect(() => {
    // Précharger les images
    const imagesToPreload = [arrow]; // ajoute ici d'autres images si nécessaire
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // Précharger les modèles 3D avec async/await et gestion d'erreur robuste
    (async () => {
      try {
        const { GLTFLoader } =
          await import("three/examples/jsm/loaders/GLTFLoader");
        const loader = new GLTFLoader();
        const modelsToPreload = [
          "./3D/models/character.glb",
          "./3D/models/waffle.glb",
          "./3D/models/plushie.glb",
          "./3D/models/bat.glb",
          "./3D/models/knife.glb",
        ];

        for (const url of modelsToPreload) {
          try {
            // Vérifier si le fichier existe avant de charger
            const response = await fetch(url, { method: "HEAD" });
            if (!response.ok) {
              console.error(
                `Le fichier ${url} n'existe pas ou est inaccessible.`,
              );
              continue;
            }
            await new Promise((resolve, reject) => {
              loader.load(
                url,
                (gltf) => {
                  console.log(`${url} préchargé`);
                  resolve(gltf);
                },
                undefined,
                (error) => {
                  reject(error);
                },
              );
            });
          } catch (error) {
            console.error(`Erreur lors du chargement de ${url}:`, error);
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'importation de GLTFLoader :", error);
      }
    })();
  }, []);

  const arrowRef = useRef(null);
  useEffect(() => {
    gsap.to(arrowRef.current, {
      y: 10,
      duration: 0.6,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });

    const handleScroll = (e) => {
      if (e.deltaY > 0) onEnter();
    };
    const handleKey = (e) => {
      if (e.key === "ArrowDown" || e.key === " ") onEnter();
    };

    window.addEventListener("wheel", handleScroll);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onEnter]);

  return (
    <main
      className="relative h-[100vh] w-[100vw] flex cursor-pointer"
      onClick={onEnter}
    >
      <div className="title-box flex items-center justify-between w-full px-[5%] max-[1000px]:flex-col max-[1000px]:justify-center max-[1000px]:items-baseline max-[1000px]:gap-[2vh]">
        <h1 className="title font-host font-regular text-[6rem] max-[1100px]:text-[5.2rem] min-[1900px]:text-[10rem] text-black">
          Human.exe
        </h1>
        <p className="context font-host font-light italic text-[1.3rem] max-[1100px]:text-[1rem] max-[1000px]:w-[65vw] min-[2500px]:text-[1.6rem] text-black w-[45vw]">
          text intro Lorem ipsum dolor sit amet, consectetur adipiscing elit,
          sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
          enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
          ut aliquip ex ea commodo consequat.
        </p>
      </div>
      <div className="call-to-action flex flex-col items-center justify-center absolute bottom-10 left-1/2 -translate-x-1/2">
        <p className="scroll-or-click font-host font-light italic text-[1.8rem] max-[1000px]:text-[1.2rem] text-black text-center">
          scroll or click
        </p>
        <img
          ref={arrowRef}
          className="max-[1000px]:h-[8px]"
          src={arrow}
          alt="arrow"
        />
      </div>
    </main>
  );
}
