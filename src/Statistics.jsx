import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import arrowr from "./assets/img/svg/arrow-right.svg";

export default function Statistics({ spawnedItems, givenItems }) {
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

    if (Array.isArray(sourceItems)) {
      itemsArray = sourceItems;
    } else if (sourceItems && Array.isArray(sourceItems.current)) {
      itemsArray = sourceItems.current;
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
  }, [
    typeof spawnedItems?.length === "number" ? spawnedItems.length : undefined,
    typeof givenItems?.length === "number" ? givenItems.length : undefined,
    typeof givenItems?.current?.length === "number"
      ? givenItems.current.length
      : undefined,
  ]);

  const total = counts.waffle + counts.plushie + counts.bat + counts.knife;

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

  useEffect(() => {
    // Disable scroll on mount
    document.body.style.overflow = "hidden";
    return () => {
      // Re-enable scroll on unmount
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-[299]" />
      <div
        ref={ref}
        className="fixed z-[300] flex items-center justify-center font-host opacity-0 backdrop-blur-[6px] bg-white/70 pointer-events-auto w-screen h-screen"
      >
        <div className="custom-gap w-[95vw] h-screen relative flex flex-col gap-[10vh]">
          <h2
            className="font-host font-regular text-[3.8rem]
         mt-[4vh] -mb-[4vh]"
          >
            statistics
          </h2>
          <p className="font-host font-light italic text-[2.5rem] -mb-[3vh] ">
            number of items given
          </p>
          <div className="flex gap-[10%]">
            <p className="font-host font-light italic text-[2.2rem]">
              total <br /> {total}
            </p>

            <div className="flex flex-col gap-[8vh] w-[100%]">
              {categories.map((cat, i) => (
                <div
                  key={cat.key}
                  className="grid grid-cols-[80px_1fr_100px] items-center gap-4 "
                >
                  <span
                    className="font-bold text-[1.4rem] text-right"
                    style={{ color: cat.color }}
                  >
                    {cat.pct}%
                  </span>
                  <div className="h-4 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      ref={(el) => {
                        if (el) barsRef.current[i] = el;
                      }}
                      className="h-full w-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                  <span
                    className="italic text-[1.2rem]"
                    style={{ color: cat.color }}
                  >
                    {cat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-10">
            <button className="absolute bottom-15 px-5 py-1 hover:px-7 hover:py-3 z-10 transition-all duration-150 bg-white border-2 border-black rounded-full flex items-center gap-3 font-host font-light text-[1.8rem]">
              <img src={arrowr} alt="arrow right" />
              <span>explanation</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
