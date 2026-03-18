import { useState, useEffect, useRef } from "react";
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
  const obj = useRef({ val: value });
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
        <div className="health-tex ">
          <span
            className={`health-percentage font-host font-regular text-[1.4rem] m-[calc(50%-1.4rem)] ${isCritical ? "critical" : isLowHealth ? "low-health" : ""}`}
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
        <div className="health-bar-background overflow-hidden bg-linear-to-r from-[#D9D9D9] to-[#CECECE] h-4.5 rounded-[100px]">
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
    </div>
  );
}
