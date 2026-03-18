import { useEffect, useRef } from "react";
import arrow from "./assets/img/svg/arrow.svg";

export default function Introduction() {
  return (
    <main className="relative h-[100vh] w-[100vw] flex">
      <div className="title-box flex items-center justify-between w-full px-[5%] max-[1000px]:flex-col max-[1000px]:justify-center max-[1000px]:items-baseline max-[1000px]:gap-[2vh]">
        <h1 className="title font-host font-regular text-[6rem] max-[1100px]:text-[5.2rem] min-[2500px]:text-[7rem] text-black">
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
        <img className="max-[1000px]:h-[8px]" src={arrow} alt="arrow" />
      </div>
    </main>
  );
}
