import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Statistics({ healthManager }) {
  const ref = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, delay: 6, ease: "power2.out" },
    );
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backdropFilter: "blur(6px)",
        backgroundColor: "rgba(255, 255, 255, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "all",
      }}
    >
      <h2>Statistics</h2>
    </div>
  );
}
