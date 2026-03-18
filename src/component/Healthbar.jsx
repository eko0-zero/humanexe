import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

export class HealthManager {
  constructor(maxHealth = 200) {
    this.maxHealth = maxHealth;
    this.currentHealth = 100;
    this.healthChangeCallbacks = [];
  }

  onHealthChange(callback) {
    this.healthChangeCallbacks.push(callback);
  }

  offHealthChange(callback) {
    this.healthChangeCallbacks = this.healthChangeCallbacks.filter(
      (cb) => cb !== callback,
    );
  }

  applyItemEffect(itemStats) {
    if (!itemStats) return;
    const healthValue = itemStats.health || itemStats.power || 0;
    const previousHealth = this.currentHealth;
    this.currentHealth = Math.max(
      0,
      Math.min(this.maxHealth, this.currentHealth + healthValue),
    );
    const data = {
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      change: this.currentHealth - previousHealth,
      itemStats,
      isDamage: healthValue < 0,
      isHealing: healthValue > 0,
    };
    this.healthChangeCallbacks.forEach((cb) => cb(data));

  }

  getHealthPercentage() {
    return (this.currentHealth / this.maxHealth) * 100;
  }

  isDead() {
    return this.currentHealth <= 0;
  }

  heal(amount) {
    this.applyItemEffect({ health: amount, name: "Heal" });
  }

  takeDamage(amount) {
    this.applyItemEffect({ health: -amount, name: "Damage" });
  }
}
function AnimatedNumber({ value, duration = 5, suffix = "" }) {
  const [display, setDisplay] = useState(value);
  const obj = useRef({ val: value});
  const isFirstRender = useRef(true); 

  useEffect(() => {
    const tween = gsap.to(obj.current, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (value % 1 !== 0) setDisplay(obj.current.val.toFixed(1));
        else setDisplay(Math.floor(obj.current.val));
      },
    });

    return () => tween.kill(); // cleanup
  }, [value]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export function HealthBar({ healthManager }) {
  const [health, setHealth] = useState(() =>
    healthManager ? healthManager.currentHealth : 0,
  );
  const [maxHealth] = useState(() =>
    healthManager ? healthManager.maxHealth : 200,
  );
  const [showDamageEffect, setShowDamageEffect] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState([]);

  useEffect(() => {
    if (!healthManager) return;

    // Sync initial state
    setHealth(healthManager.currentHealth);

    const handleHealthChange = (data) => {
      setHealth(data.currentHealth);

      if (data.isDamage) {
        setShowDamageEffect(true);
        setTimeout(() => setShowDamageEffect(false), 200);
      }

      if (data.change !== 0) {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newText = {
          id,
          value: data.change,
          isDamage: data.isDamage,
          x: Math.random() * 40 - 20,
        };
        setFloatingTexts((prev) => [...prev, newText]);
        setTimeout(() => {
          setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
        }, 1500);
      }
    };

    healthManager.onHealthChange(handleHealthChange);
    return () => healthManager.offHealthChange(handleHealthChange);
  }, [healthManager]);

  const healthPercentage = (health / maxHealth) * 100;
  const displayPercentage = (health / maxHealth) * 200;
  const isLowHealth = health / maxHealth < 0.35;
  const isCritical = health / maxHealth < 0.2;
  const isVeryGood = health / maxHealth > 0.7;

  return (
    <div className="health-bar-container py-5 z-10 ">
      <div
        className={`health-bar-wrapper ${showDamageEffect ? "damage-flash" : ""}`}
      >
        <div className="health-text">
          <span
            className={`health-percentage ont-host font-regular text-[1.4rem] left-5 m-[calc(50%-1.4rem)] ${isCritical ? "critical" : isLowHealth ? "low-health" : ""}`}
            style={{
              width: `${healthPercentage}%`,
              transition: "0.3s ease-out",
              color: isVeryGood
                ? "#105D84"
                : isCritical
                  ? "#AF1111"
                  : isLowHealth
                    ? "#AF7F11"
                    : "#108420",
            }}
          >
            <AnimatedNumber value={Math.ceil(displayPercentage)} suffix="%" />
          </span>
        </div>
        <div className="health-bar-background bg-linear-to-r from-[#D9D9D9] to-[#CECECE] h-4.5 rounded-[100px]">
          <div
            className={`health-bar-fill h-4.5 rounded-[100px] ${isCritical ? "critical" : isLowHealth ? "low-health" : ""}`}
            style={{
              width: `${healthPercentage}%`,
              transition: " width 5s ease-out",
              background: isVeryGood
                ? "linear-gradient(to right, #0079F2, #67ADF4)"
                : isCritical
                  ? "linear-gradient(to right, #E40000, #EA3F3F)"
                  : isLowHealth
                    ? "linear-gradient(to right, #F89000, #F7C862)"
                    : "linear-gradient(to right, #18C52F, #7CDC89)",
            }}
          >
            <div className="health-bar-shine" />
          </div>
        </div>
      </div>

      {/* <div className="floating-texts">
        {floatingTexts.map((text) => (
          <div
            key={text.id}
            className={`floating-text ${text.isDamage ? "damage" : "heal"}`}
            style={{ "--x-offset": `${text.x}px` }}
          >
            {text.isDamage ? "-" : "+"}
            {Math.abs(text.value)}
          </div>
        ))}
      </div> */}

      {/* <style>{`
 

      

        .health-bar-wrapper.damage-flash {
          animation: damageFlash 0.2s ease-out;
        }
        @keyframes damageFlash {
          0% { box-shadow: 0 0 30px rgba(255,0,0,0.8); }
          100% { box-shadow: 0 0 20px rgba(0,0,0,0.7); }
        }
        .health-bar-background {
          width: 100%;
          height: 28px;
          background: rgba(20,20,20,0.8);
          border-radius: 4px;
          overflow: hidden;
          border: 2px solid rgba(100,100,100,0.5);
          position: relative;
        }
        .health-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff00, #90EE90);
          border-radius: 2px;
          position: relative;
          box-shadow: 0 0 10px rgba(0,255,0,0.6);
          transition: background 0.3s ease-out;
        }
        .health-bar-fill.low-health {
          background: linear-gradient(90deg, #ff9800, #ffeb3b);
          box-shadow: 0 0 10px rgba(255,152,0,0.8);
        }
        .health-bar-fill.critical {
          background: linear-gradient(90deg, #ff4444, #ff0000);
          box-shadow: 0 0 15px rgba(255,0,0,1);
          animation: criticalPulse 0.6s infinite;
        }
        @keyframes criticalPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(255,0,0,0.8); }
          50% { box-shadow: 0 0 25px rgba(255,0,0,1); }
        }
        .health-bar-shine {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
          border-radius: 2px 2px 0 0;
        }
        .health-text {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          color: white;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
          font-weight: bold;
          pointer-events: none;
        }
        .health-percentage { font-size: 16px; font-weight: bold; }
        .critical-warning {
          margin-top: 8px;
          padding: 6px 12px;
          background: rgba(255,0,0,0.7);
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          animation: warningPulse 0.8s infinite;
        }
        @keyframes warningPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .floating-texts {
          position: absolute;
          top: 0; left: 0;
          width: 200%;
          pointer-events: none;
        }
        .floating-text {
          position: absolute;
          left: 50%; top: 50%;
          transform: translateX(var(--x-offset));
          font-weight: bold;
          font-size: 18px;
          animation: floatUp 1.5s ease-out forwards;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
        }
        .floating-text.damage { color: #ff4444; }
        .floating-text.heal { color: #00ff00; }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateX(var(--x-offset)) translateY(0); }
          100% { opacity: 0; transform: translateX(var(--x-offset)) translateY(-40px); }
        }
      `}</style> */}
    </div>
  );
}
