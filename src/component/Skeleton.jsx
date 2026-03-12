import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────
// Spring simple : position avec inertie
// ─────────────────────────────────────────────
class Spring {
  constructor(stiffness = 8, damping = 0.6) {
    this.value = 0;
    this.velocity = 0;
    this.target = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }
  update(dt) {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity += force * dt;
    this.velocity *= 1 - this.damping * dt * 10;
    this.value += this.velocity * dt;
  }
}

const Skeleton = forwardRef(
  (
    {
      model,
      world,
      characterBody,
      headBone,
      leftArmBone,
      rightArmBone,
      leftArmBoneTop,
      rightArmBoneTop,
    },
    ref
  ) => {
    const bonesRef = useRef({});
    const springsRef = useRef({});
    const prevPosRef = useRef({ x: 0, y: 0, z: 0 });
    const velocityRef = useRef({ x: 0, y: 0, z: 0 });
    const lastTimeRef = useRef(performance.now());

    useImperativeHandle(ref, () => ({
      updateBones: () => {
        if (!characterBody) return;

        const now = performance.now();
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = now;

        // ── Calcul de la vélocité du personnage ──
        const cx = characterBody.position.x;
        const cy = characterBody.position.y;
        const cz = characterBody.position.z;

        const vx = (cx - prevPosRef.current.x) / dt;
        const vy = (cy - prevPosRef.current.y) / dt;

        // Lissage vélocité
        velocityRef.current.x = velocityRef.current.x * 0.7 + vx * 0.3;
        velocityRef.current.y = velocityRef.current.y * 0.7 + vy * 0.3;

        prevPosRef.current = { x: cx, y: cy, z: cz };

        const velX = THREE.MathUtils.clamp(velocityRef.current.x, -15, 15);
        const velY = THREE.MathUtils.clamp(velocityRef.current.y, -15, 15);

        const springs = springsRef.current;

        // ── Targets des springs selon la vélocité ──

        // Inclinaison du corps (lean)
        springs.bodyLeanZ.target = -velX * 0.025;   // penche dans direction mouvement X
        springs.bodyLeanX.target =  velY * 0.02;    // penche selon Y (saut/chute)
        springs.bodyStretchY.target = -Math.abs(velY) * 0.003; // légère compression

        // Tête : lag derrière le mouvement
        springs.headLagX.target = -velX * 0.04;
        springs.headBobY.target = -Math.abs(velX) * 0.015;

        // Bras : ballottent dans la direction opposée
        springs.leftArmSwing.target  =  velX * 0.06;
        springs.rightArmSwing.target = -velX * 0.06;
        springs.armsDropY.target     = -Math.abs(velX) * 0.02 + velY * 0.03;

        // Avant-bras : suivent avec un délai
        springs.leftForeSwing.target  =  velX * 0.04;
        springs.rightForeSwing.target = -velX * 0.04;

        // Jambes : oscillent en opposition
        springs.leftLegSwing.target  = -velX * 0.03;
        springs.rightLegSwing.target =  velX * 0.03;
        springs.legsSquash.target    = -Math.abs(velY) * 0.025;

        // Update tous les springs
        for (const key in springs) {
          springs[key].update(dt);
        }

        // ── Application sur les bones ──
        const bones = bonesRef.current;

        // CORPS (spine/body)
        if (bones.spine) {
          bones.spine.rotation.z = springs.bodyLeanZ.value;
          bones.spine.rotation.x = springs.bodyLeanX.value;
          bones.spine.scale.y = 1 + springs.bodyStretchY.value;
        }

        // TÊTE
        if (bones.head) {
          bones.head.rotation.z = springs.headLagX.value;
          bones.head.rotation.y = -springs.headLagX.value * 0.5;
          bones.head.position.y = (bones.head.userData.restY || 0) + springs.headBobY.value;
        }

        // BRAS GAUCHE (upper)
        if (bones.leftArmTop) {
          bones.leftArmTop.rotation.z = (bones.leftArmTop.userData.restZ || 0) + springs.leftArmSwing.value;
          bones.leftArmTop.rotation.y = springs.armsDropY.value;
        }
        // AVANT-BRAS GAUCHE
        if (bones.leftArmBottom) {
          bones.leftArmBottom.rotation.z = springs.leftForeSwing.value;
        }

        // BRAS DROIT (upper)
        if (bones.rightArmTop) {
          bones.rightArmTop.rotation.z = (bones.rightArmTop.userData.restZ || 0) + springs.rightArmSwing.value;
          bones.rightArmTop.rotation.y = -springs.armsDropY.value;
        }
        // AVANT-BRAS DROIT
        if (bones.rightArmBottom) {
          bones.rightArmBottom.rotation.z = springs.rightForeSwing.value;
        }

        // JAMBE GAUCHE
        if (bones.leftLegTop) {
          bones.leftLegTop.rotation.x = springs.leftLegSwing.value;
        }
        if (bones.leftLegBottom) {
          bones.leftLegBottom.rotation.x = springs.legsSquash.value;
        }

        // JAMBE DROITE
        if (bones.rightLegTop) {
          bones.rightLegTop.rotation.x = springs.rightLegSwing.value;
        }
        if (bones.rightLegBottom) {
          bones.rightLegBottom.rotation.x = -springs.legsSquash.value;
        }
      },
    }));

    useEffect(() => {
      if (!model || !world || !characterBody) return;

      // ── Récupérer le skeleton ──
      let skeleton;
      model.traverse((o) => {
        if (o.isSkinnedMesh && o.skeleton) skeleton = o.skeleton;
      });
      if (!skeleton) return;

      console.log("Bones:", skeleton.bones.map((b) => b.name));

      const findBone = (names) => {
        for (const name of names) {
          const b = skeleton.getBoneByName(name);
          if (b) return b;
        }
        return null;
      };

      // ── Assigner les bones ──
      bonesRef.current.spine         = findBone(["body"]);
      bonesRef.current.head          = findBone(["head"]);
      bonesRef.current.leftLegTop    = findBone(["leg-topl"]);
      bonesRef.current.leftLegBottom = findBone(["leg-bottoml"]);
      bonesRef.current.rightLegTop   = findBone(["leg-topr"]);
      bonesRef.current.rightLegBottom= findBone(["leg-bottomr"]);
      bonesRef.current.leftArmTop    = findBone(["for-arm-topl", "first-arm-topl"]);
      bonesRef.current.leftArmBottom = findBone(["for-arm-bottoml", "first-arm-bottoml"]);
      bonesRef.current.rightArmTop   = findBone(["for-arm-topr", "first-arm-topr"]);
      bonesRef.current.rightArmBottom= findBone(["for-arm-bottomr", "first-arm-bottomr"]);

      // Props passées depuis App.jsx (bones spring animés)
      if (headBone)        bonesRef.current.head         = headBone;
      if (leftArmBone)     bonesRef.current.leftArmBottom= leftArmBone;
      if (rightArmBone)    bonesRef.current.rightArmBottom= rightArmBone;
      if (leftArmBoneTop)  bonesRef.current.leftArmTop   = leftArmBoneTop;
      if (rightArmBoneTop) bonesRef.current.rightArmTop  = rightArmBoneTop;

      // ── Sauvegarder les positions de repos ──
      for (const key in bonesRef.current) {
        const bone = bonesRef.current[key];
        if (!bone) continue;
        bone.userData.restY = bone.position.y;
        bone.userData.restZ = bone.rotation.z;
        bone.userData.restX = bone.rotation.x;
      }

      // ── Initialiser les springs ──
      const S = (s, d) => new Spring(s, d);
      springsRef.current = {
        bodyLeanZ:     S(6,  0.55),
        bodyLeanX:     S(5,  0.55),
        bodyStretchY:  S(10, 0.6),
        headLagX:      S(4,  0.5),
        headBobY:      S(8,  0.6),
        leftArmSwing:  S(4,  0.45),
        rightArmSwing: S(4,  0.45),
        armsDropY:     S(5,  0.5),
        leftForeSwing: S(3,  0.4),
        rightForeSwing:S(3,  0.4),
        leftLegSwing:  S(5,  0.5),
        rightLegSwing: S(5,  0.5),
        legsSquash:    S(8,  0.6),
      };

      // Init position précédente
      prevPosRef.current = {
        x: characterBody.position.x,
        y: characterBody.position.y,
        z: characterBody.position.z,
      };

      return () => {
        bonesRef.current = {};
        springsRef.current = {};
      };
    }, [model, world, characterBody, headBone, leftArmBone, rightArmBone, leftArmBoneTop, rightArmBoneTop]);

    return null;
  }
);

export default Skeleton;