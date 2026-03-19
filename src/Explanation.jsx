import React from "react";
import arrowr from "./assets/img/svg/arrow-right.svg";
import Menu from "./component/Menu.jsx";
import wafflei from "./assets/img/waffle.webp";
import plushiei from "./assets/img/plushie.webp";
import bati from "./assets/img/bat.webp";
import knifei from "./assets/img/knife.webp";
const Explanation = ({ onNavigate }) => {
  return (
    <>
      <Menu open={false} onNavigate={onNavigate} />

      <main className="relative w-full h-screen font-host">
        <h2
          className="text-title ml-15 mt-6 mb-[18vh]
        "
        >
          explanation
        </h2>
        <div className="flex flex-col gap-[2vh] ml-[30vw] mr-[10vw] mb-[5vh] ">
          <h4 className="text-big-base ">Resume</h4>
          <p className="text-base font-light italic">
            What you have just seen is part of an experiment on dehumanization.
            Using a simplified character and a few objects, it demonstrates how
            certain characteristics can lead us toview others as “non-human” and
            influence the way we treat them.
          </p>
        </div>

        <div className="flex flex-col gap-[2vh] mr-[30vw] ml-[10vw]">
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
        <div className="flex flex-col gap-[2vh] mr-[10vw] ml-[40vw] mt-[30vh]">
          <h4 className="text-big-base ">Waffle</h4>
          <p className="text-base font-light italic">
            <img className="img-text-waf" src={wafflei} alt="waffle image" />
            This item is a positive item that grants +20 HP, placing it in the
            “Very Good” category. This is a choice that directly helps improve
            the character’s health and well-being. If this is the item you’ve
            given most often, it shows that you tend to prioritize beneficial
            actions and support others. This behavior suggests that you’re
            mindful of how your choices affect others and that you strive to act
            in ways that promote their safety, stability, and well-being.
          </p>
        </div>
        <div className="flex flex-col gap-[2vh] mr-[40vw] ml-[10vw] mt-[10vh]">
          <h4 className="text-big-base ">Plushie</h4>
          <p className="text-base font-light italic">
            <img className="img-text-plu" src={plushiei} alt="plushie image" />
            Cet élément est positif : il confère +10 PV, ce qui le classe dans
            la catégorie « Bon ». Le fait de choisir cet élément le plus souvent
            suggère que vous privilégiez systématiquement les actions qui ont
            des effets bénéfiques pour les autres. Cela reflète une approche
            réfléchie de la prise de décision, montrant une tendance à agir de
            manière à renforcer la sécurité, la santé dans votre environnement.
            Ce schéma indique un état d'esprit empathique, qui valorise les
            résultats constructifs et cherche à maximiser l'impact positif par
            des choix réfléchis et attentionnés.
          </p>
        </div>
        <div className="flex flex-col gap-[2vh] mr-[10vw] ml-[40vw] mt-[20vh]">
          <h4 className="text-big-base ">Baseball bat</h4>
          <p className="text-base font-light italic">
            <img className="img-text-bat" src={bati} alt="bat image" />
            This item has a negative effect that reduces HP by 30, which places
            it in the “Bad” category. If this is the item you distributed most
            often, it suggests a tendency to make choices that may harm others,
            even unintentionally. This pattern indicates that you may be less
            attentive to the well-being of those around you and that the impact
            of your actions on others is not always your primary concern.
          </p>
        </div>
        <div className="flex flex-col gap-[2vh] mr-[40vw] ml-[10vw] mt-[6vh] mb-[10vh]">
          <h4 className="text-big-base  ">Knife</h4>
          <p className="text-base font-light italic">
            <img className="img-text-kni" src={knifei} alt="plushie image" />
            This item has a negative effect: it reduces HP by 50, which places
            it in the “Bad” category. If this is the item you distributed most
            often, it suggests a clear tendency to make choices that may harm
            others. This pattern indicates a lack of empathy, suggesting that
            you may not prioritize the well-being or feelings of those around
            you. Frequently selecting this item highlights a tendency where
            personal preferences or disregard for consequences take precedence
            over consideration for others.
          </p>
        </div>

        <button
          onClick={() => onNavigate && onNavigate("intro")}
          className="absolute right-15 px-5 py-1 hover:px-7 hover:py-3 z-10 transition-all duration-150 bg-white border-2 border-black rounded-full flex items-center justify-center gap-3 font-host font-light text-big-base"
        >
          <img src={arrowr} alt="arrow right" />
          <span>restart</span>
        </button>

        <div className="text-base font-host font-light italic mt-[50vh] flex flex-col justify-end item-end w-screen ">
          <p className=" ml-15 mr-[25vw]">
            This project was developed during my final year at EIKON as part of
            my third year capstone project, centered on the theme “Out of
            Control.” Thank you for visiting !!
          </p>
          <p className="text-right mr-10 mb-5">Clara Del Vecchio</p>
        </div>
      </main>
    </>
  );
};

export default Explanation;
