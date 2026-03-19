import React from "react";
import arrowr from "./assets/img/svg/arrow-right.svg";
import Menu from "./component/Menu.jsx";

const Explanation = ({ onNavigate }) => {
  return (
    <>
      {/* Menu en dehors du main pour éviter les problèmes de z-index */}
      <Menu open={false} onNavigate={onNavigate} />

      <main className="relative w-full h-screen font-host">
        <h2
          className="text-title ml-15 mt-6
        "
        >
          explanation
        </h2>
        <div className="">
          <h4 className="text-big-base ">Resume</h4>
          <p className="text-base font-light italic">
            What you have just seen is part of an experiment on dehumanization.
            Using a simplified character and a few objects, it demonstrates how
            certain characteristics can lead us to view others as “non-human”
            and influence the way we treat them.
          </p>
        </div>

        <div className="">
          <h4 className="text-big-base ">Dehumanization </h4>
          <p className="text-base font-light italic">
            Dehumanization syndrome occurs when someone is deprived of what
            makes them human: their emotions, their dignity, or their ability to
            feel and interact with others. This can occur in society, for
            example through stereotypes, discrimination, or exclusion, and
            illustrates how certain contexts can lead us to view others as “less
            human.” This distorted perspective can have serious consequences: it
            fosters indifference and contempt and can even lead to physical or
            psychological violence against those who are dehumanized.
          </p>
        </div>
        <div className="">
          <h4 className="text-big-base ">Waffle</h4>
          <p className="text-base font-light italic">
            This item is a positive one that grants +20 HP, placing it in the
            “Very Good” category. If this is the item you've given out most
            often, it shows that you're a truly empathetic person.
          </p>
        </div>
        <div className="">
          <h4 className="text-big-base ">Plushie</h4>
          <p className="text-base font-light italic">
            This item is a positive one that grants +10 HP, which places it in
            the “Good” category. If this is the item you've given out most
            often, it shows that you're generally an empathetic person.
          </p>
        </div>
        <div className="">
          <h4 className="text-big-base ">Baseball bat</h4>
          <p className="text-base font-light italic">
            This item is a negative item that reduces HP by 30, which places it
            in the “Good” category. If this is the item you've given out most
            often, it suggests that you're generally a somewhat empathetic
            person.
          </p>
        </div>
        <div className="">
          <h4 className="text-big-base ">Knife</h4>
          <p className="text-base font-light italic">
            This item is a negative item that reduces HP by 50, which places it
            in the “Good” category. If this is the item you've given out most
            often, it shows that you lack empathy.
          </p>
        </div>

        <button
          onClick={() => onNavigate && onNavigate("intro")}
          className="px-5 py-1 hover:px-7 hover:py-3 z-10 transition-all duration-150 bg-white border-2 border-black rounded-full flex items-center justify-center gap-3 font-host font-light text-big-base"
        >
          <img src={arrowr} alt="arrow right" />
          <span>restart</span>
        </button>

        <div className="text-base ">
          <p>
            This project was developed during my final year at EIKON as part of
            my third-year capstone project, centered on the theme “Out of
            Control.” Thank you for visiting !!
          </p>
          <p>Clara Del Vecchio</p>
        </div>
      </main>
    </>
  );
};

export default Explanation;
