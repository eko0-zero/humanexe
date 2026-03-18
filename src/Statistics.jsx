import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import arrowr from "./assets/img/svg/arrow-right.svg";

export default function Statistics({ spawnedItems }) {
  const ref = useRef(null);
  const barsRef = useRef({});

  const [counts, setCounts] = useState({
    waffle: 0,
    plushie: 0,
    bat: 0,
    knife: 0,
  });

  // 🔍 LOG 1: Vérifier que le composant est monté
  useEffect(() => {
    console.log("📊 Statistics composant MONTÉ");
    return () => console.log("📊 Statistics composant DÉMONTÉ");
  }, []);

  // 🔍 LOG 2: Vérifier les props reçues
  useEffect(() => {
    console.log("📊 spawnedItems reçu:", spawnedItems);
    console.log("📊 spawnedItems.current:", spawnedItems?.current);
    console.log("📊 Type:", typeof spawnedItems);
    console.log("📊 Est un array?", Array.isArray(spawnedItems));
    console.log(
      "📊 Est un array.current?",
      Array.isArray(spawnedItems?.current),
    );
  }, [spawnedItems]);

  useEffect(() => {
    // Normaliser les données reçues (array direct ou ref React)
    let itemsArray = [];

    if (Array.isArray(spawnedItems)) {
      itemsArray = spawnedItems;
    } else if (spawnedItems && Array.isArray(spawnedItems.current)) {
      itemsArray = spawnedItems.current;
    }

    let validItems = itemsArray.filter(
      (item) =>
        item &&
        item.modelName &&
        !item.deleted &&
        (item.animationPlayed === true ||
          item.animationStarted === true ||
          item.animationTriggered === true ||
          item.hasPlayedAnimation === true ||
          (typeof item.animationCount === "number" &&
            item.animationCount > 0) ||
          (typeof item.interactionCount === "number" &&
            item.interactionCount > 0)),
    );

    // Si aucun item n'a de flag d'animation, fallback : compter les items non supprimés
    if (validItems.length === 0) {
      validItems = itemsArray.filter(
        (item) => item && item.modelName && !item.deleted,
      );
    }

    const newCounts = {
      waffle: 0,
      plushie: 0,
      bat: 0,
      knife: 0,
    };

    validItems.forEach((item) => {
      const key = item.modelName.toLowerCase().trim();

      if (!newCounts.hasOwnProperty(key)) return;

      let interactions = 1;

      if (typeof item.interactionCount === "number") {
        interactions = item.interactionCount;
      } else if (typeof item.animationCount === "number") {
        interactions = item.animationCount;
      }

      newCounts[key] += interactions;
    });

    setCounts(newCounts);
  }, [spawnedItems]);

  const total = counts.waffle + counts.plushie + counts.bat + counts.knife;
  console.log("📊 Total calculé:", total);

  const categories = [
    {
      key: "waffle",
      label: "very good",
      color: "#3b82f6",
      pct: total ? Math.round((counts.waffle / total) * 100) : 0,
    },
    {
      key: "plushie",
      label: "good",
      color: "#22c55e",
      pct: total ? Math.round((counts.plushie / total) * 100) : 0,
    },
    {
      key: "bat",
      label: "bad",
      color: "#f59e0b",
      pct: total ? Math.round((counts.bat / total) * 100) : 0,
    },
    {
      key: "knife",
      label: "very bad",
      color: "#ef4444",
      pct: total ? Math.round((counts.knife / total) * 100) : 0,
    },
  ];

  useEffect(() => {
    if (!ref.current) return;

    gsap.fromTo(
      ref.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, delay: 6, ease: "power2.out" },
    );

    categories.forEach((cat, i) => {
      const bar = barsRef.current[i];
      if (!bar) return;

      gsap.fromTo(
        bar,
        { width: "0%" },
        {
          width: `${cat.pct}%`,
          duration: 1,
          delay: 6.6 + i * 0.15,
          ease: "power3.out",
        },
      );
    });
  }, [total]);

  return (
    <div
      ref={ref}
      className="fixed z-300 flex items-center justify-center font-host opacity-[0] backdrop-blur-[6px] bg-[rgba(255,255,255,0.45)] pointer-events-all w-[100vw] h-[100vh]"
    >
      <div className="w-[95vw] h-[100vh] relative">
        <h2 className="font-host font-regular text-[3.8rem] my-[3vh]">
          statistics
        </h2>
        <p className="font-host font-light italic text-[2.5rem]">
          number of items given
        </p>
        <p
          style={{
            fontStyle: "italic",
            fontSize: "1.2rem",
            margin: "0 0 1.5rem",
          }}
        >
          total <strong>{total}</strong>
        </p>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.6rem" }}
        >
          {categories.map((cat, i) => (
            <div
              key={cat.key}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 100px",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span
                style={{
                  color: cat.color,
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  textAlign: "right",
                }}
              >
                {cat.pct}%
              </span>
              <div
                style={{
                  height: "18px",
                  backgroundColor: "#d1d5db",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  ref={(el) => {
                    if (el) barsRef.current[i] = el;
                  }}
                  style={{
                    height: "100%",
                    width: "0%",
                    backgroundColor: cat.color,
                    borderRadius: "999px",
                  }}
                />
              </div>
              <span
                style={{
                  color: cat.color,
                  fontStyle: "italic",
                  fontSize: "1.2rem",
                }}
              >
                {cat.label}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "2.5rem",
          }}
        >
          <button className="absolute bottom-15 px-5 py-1 hover:px-7 hover:py-3 z-10 transition-all duration-150 bg-white border-2 border-black rounded-[100px] flex items-center gap-3 font-host font-light text-[1.8rem]">
            <img src={arrowr} alt="arrow right" />
            <span>explanation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
