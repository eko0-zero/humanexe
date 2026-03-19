import { useEffect, useRef } from "react";
import arrow from "./assets/img/svg/arrow.svg";
import gsap from "gsap";

export default function Introduction({ onEnter }) {
  const titleRef = useRef(null);
  const headingRef = useRef(null);
  const contextRef = useRef(null);
  const ctaRef = useRef(null);

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
    const imagesToPreload = [arrow];
    for (let i = 0; i < 750; i++) {
      const padded = String(i).padStart(3, "0");
      imagesToPreload.push(`./3D/textures/eyes/eyes_${padded}.webp`);
    }
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

  useEffect(() => {
    const tl = gsap.timeline({
      defaults: { duration: 1.3, ease: "power2.out" },
    });
    tl.to([headingRef.current, contextRef.current], { opacity: 1, y: 0 });
    tl.to(ctaRef.current, { opacity: 1, y: 0 }, "-=0.6");
  }, []);

  return (
    <main
      className="relative h-[100vh] w-[100vw] flex cursor-pointer overflow-hidden"
      onClick={onEnter}
    >
      <div
        ref={titleRef}
        className="title-box flex items-center justify-between w-full px-[5%] max-[1000px]:flex-col max-[1000px]:justify-center max-[1000px]:items-baseline max-[1000px]:gap-[2vh]"
      >
        <h1
          ref={headingRef}
          className="title font-host font-regular text-title max-[1100px]:text-[5.2rem] min-[1900px]:text-[10rem] text-black opacity-0 translate-y-10"
        >
          Human.exe
        </h1>
        <p
          ref={contextRef}
          className="context font-host font-light italic text-base max-[1100px]:text-[1rem] max-[1000px]:w-[65vw] min-[2500px]:text-[1.6rem] text-black w-[45vw] opacity-0 translate-y-10"
        >
          The following page is a 3D simulation that you can explore and
          interact with. Feel free to experiment and try out different actions.
        </p>
      </div>
      <div
        className="call-to-action flex flex-col items-center justify-center absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 translate-y-10"
        ref={ctaRef}
      >
        <p className="scroll-or-click font-host font-light italic text-big-base max-[1000px]:text-[1.2rem] text-black text-center">
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
