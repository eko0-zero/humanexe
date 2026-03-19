import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import arrowr from "./assets/img/svg/arrow-right.svg";

export default function Statistics({
  spawnedItems,
  givenItems,
  onNavigate, // onNavigate doit être passé depuis Root
  linkClass = "", // valeur par défaut si aucune classe supplémentaire
}) {
  const ref = useRef(null);
  const barsRef = useRef({});
  const [counts, setCounts] = useState({
    waffle: 0,
    plushie: 0,
    bat: 0,
    knife: 0,
  });

  useEffect(() => {
    const sourceItems = givenItems ?? spawnedItems;
    let itemsArray = [];

    if (Array.isArray(sourceItems)) itemsArray = sourceItems;
    else if (sourceItems && Array.isArray(sourceItems.current))
      itemsArray = sourceItems.current;

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

    if (validItems.length === 0) {
      validItems = itemsArray.filter(
        (item) => item && item.modelName && !item.deleted,
      );
    }

    const newCounts = { waffle: 0, plushie: 0, bat: 0, knife: 0 };

    validItems.forEach((item) => {
      const key = item.modelName.toLowerCase().trim();
      if (!newCounts.hasOwnProperty(key)) return;

      let interactions = 1;
      if (typeof item.interactionCount === "number")
        interactions = item.interactionCount;
      else if (typeof item.animationCount === "number")
        interactions = item.animationCount;

      newCounts[key] += interactions;
    });

    setCounts(newCounts);
  }, [spawnedItems?.length, givenItems?.length, givenItems?.current?.length]);

  const total = counts.waffle + counts.plushie + counts.bat + counts.knife;

  const categories = [
    {
      key: "waffle",
      label: "very good",
      color: "#105D84",
      gradient: "linear-gradient(to right, #0079F2, #67ADF4)",
      pct: total ? Math.round((counts.waffle / total) * 100) : 0,
    },
    {
      key: "plushie",
      label: "good",
      color: "#108420",
      gradient: "linear-gradient(to right, #18C52F, #7CDC89)",
      pct: total ? Math.round((counts.plushie / total) * 100) : 0,
    },
    {
      key: "bat",
      label: "bad",
      color: "#AF7F11",
      gradient: "linear-gradient(to right, #F89000, #F7C862)",
      pct: total ? Math.round((counts.bat / total) * 100) : 0,
    },
    {
      key: "knife",
      label: "very bad",
      color: "#AF1111",
      gradient: "linear-gradient(to right, #E40000, #EA3F3F)",
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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed z-[300] flex items-center justify-center font-host opacity-0 backdrop-blur-[6px] bg-white/90 pointer-events-auto w-screen h-screen"
    >
      <div className="custom-gap w-[95vw] h-screen relative flex flex-col gap-[10vh]">
        <h2 className="font-host font-regular text-small-title mt-[4vh] -mb-[10vh]">
          statistics
        </h2>
        <p className="font-host font-light italic text-big-base -mb-[3vh]">
          number of items given
        </p>

        <div className="flex gap-[10%]">
          <p className="font-host font-light italic text-big-base">
            total <br /> {total}
          </p>

          <div className="flex flex-col gap-[6vh] w-[100%] font-host">
            {categories.map((cat, i) => (
              <div
                key={cat.key}
                className="grid grid-cols-[100px_1fr_150px] items-center gap-4"
              >
                <span
                  className="font-light text-big-base text-right pr-5"
                  style={{ color: cat.color }}
                >
                  {cat.pct}%
                </span>
                <div className="h-5 bg-linear-to-r from-[#D9D0D9] to-[#CECECE] rounded-full overflow-hidden">
                  <div
                    ref={(el) => (barsRef.current[i] = el)}
                    className="h-full w-0 rounded-full"
                    style={{ backgroundImage: cat.gradient }}
                  />
                </div>
                <span
                  className="italic text-base font-light text-right"
                  style={{ color: cat.color }}
                >
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-10">
          <button
            className={`px-5 py-1 hover:px-7 hover:py-3 z-10 transition-all duration-150 bg-white border-2 border-black rounded-full flex items-center justify-center gap-3 font-host font-light text-big-base ${linkClass}`}
            onClick={() => onNavigate("explanation")} // <-- utilise la fonction passée par Root
          >
            <img src={arrowr} alt="arrow right" />
            <span>explanation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
