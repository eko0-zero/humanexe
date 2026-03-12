import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

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
    const springsRef = useRef(null);
    const prevPosRef = useRef({ x: 0, y: 0, z: 0 });
    const velocityRef = useRef({ x: 0, y: 0, z: 0 });
    const lastTimeRef = useRef(performance.now());
    const readyRef = useRef(false);

    useImperativeHandle(ref, () => ({
      updateBones: () => {
        if (!readyRef.current || !springsRef.current || !characterBody) return;

        const now = performance.now();
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = now;

        const cx = characterBody.position.x;
        const cy = characterBody.position.y;

        const vx = (cx - prevPosRef.current.x) / dt;
        const vy = (cy - prevPosRef.current.y) / dt;

        velocityRef.current.x = velocityRef.current.x * 0.7 + vx * 0.3;
        velocityRef.current.y = velocityRef.current.y * 0.7 + vy * 0.3;

        prevPosRef.current = { x: cx, y: cy, z: characterBody.position.z };

        const velX = THREE.MathUtils.clamp(velocityRef.current.x, -15, 15);
        const velY = THREE.MathUtils.clamp(velocityRef.current.y, -15, 15);

        const sp = springsRef.current;

        // Targets selon vélocité
        sp.bodyLeanZ.target      = -velX * 0.03;
        sp.bodyLeanX.target      =  velY * 0.02;
        sp.bodyStretchY.target   = -Math.abs(velY) * 0.003;
        sp.headLagZ.target       = -velX * 0.05;
        sp.headBobY.target       = -Math.abs(velX) * 0.015;
        sp.leftArmSwing.target   =  velX * 0.08;
        sp.rightArmSwing.target  = -velX * 0.08;
        sp.armsDropY.target      = -Math.abs(velX) * 0.02 + velY * 0.03;
        sp.leftForeSwing.target  =  velX * 0.05;
        sp.rightForeSwing.target = -velX * 0.05;
        sp.leftLegSwing.target   = -velX * 0.04;
        sp.rightLegSwing.target  =  velX * 0.04;
        sp.legsSquash.target     = -Math.abs(velY) * 0.025;

        for (const key in sp) sp[key].update(dt);

        const b = bonesRef.current;

        // Corps
        if (b.spine) {
          b.spine.rotation.z = sp.bodyLeanZ.value;
          b.spine.rotation.x = sp.bodyLeanX.value;
          b.spine.scale.y    = 1 + sp.bodyStretchY.value;
        }

        // Tête
        if (b.head) {
          b.head.rotation.z = sp.headLagZ.value;
          b.head.rotation.y = -sp.headLagZ.value * 0.5;
          b.head.position.y = (b.head.userData.restY || 0) + sp.headBobY.value;
        }

        // Bras gauche upper
        if (b.leftArmTop) {
          b.leftArmTop.rotation.z = (b.leftArmTop.userData.restZ || 0) + sp.leftArmSwing.value;
          b.leftArmTop.rotation.x = (b.leftArmTop.userData.restX || 0) + sp.armsDropY.value;
        }
        // Avant-bras gauche
        if (b.leftArmBottom) {
          b.leftArmBottom.rotation.z = (b.leftArmBottom.userData.restZ || 0) + sp.leftForeSwing.value;
        }

        // Bras droit upper
        if (b.rightArmTop) {
          b.rightArmTop.rotation.z = (b.rightArmTop.userData.restZ || 0) + sp.rightArmSwing.value;
          b.rightArmTop.rotation.x = (b.rightArmTop.userData.restX || 0) - sp.armsDropY.value;
        }
        // Avant-bras droit
        if (b.rightArmBottom) {
          b.rightArmBottom.rotation.z = (b.rightArmBottom.userData.restZ || 0) + sp.rightForeSwing.value;
        }

        // Jambes
        if (b.leftLegTop)     b.leftLegTop.rotation.x     = (b.leftLegTop.userData.restX || 0)     + sp.leftLegSwing.value;
        if (b.leftLegBottom)  b.leftLegBottom.rotation.x  = (b.leftLegBottom.userData.restX || 0)  + sp.legsSquash.value;
        if (b.rightLegTop)    b.rightLegTop.rotation.x    = (b.rightLegTop.userData.restX || 0)    + sp.rightLegSwing.value;
        if (b.rightLegBottom) b.rightLegBottom.rotation.x = (b.rightLegBottom.userData.restX || 0) - sp.legsSquash.value;
      },
    }));

    useEffect(() => {
      if (!model || !world || !characterBody) return;

      let skeleton;
      model.traverse((o) => {
        if (o.isSkinnedMesh && o.skeleton) skeleton = o.skeleton;
      });
      if (!skeleton) return;

      const findBone = (...names) => {
        for (const name of names) {
          const b = skeleton.getBoneByName(name);
          if (b) return b;
        }
        return null;
      };

      const b = bonesRef.current;

      // ✅ Noms exacts vus dans la console
      b.spine          = findBone("body");
      b.head           = findBone("head");
      b.neck           = findBone("neck");

      // Jambes — noms confirmés dans la console
      b.leftLegTop     = findBone("leg-topl");
      b.leftLegBottom  = findBone("leg-bottoml");
      b.rightLegTop    = findBone("leg-topr");
      b.rightLegBottom = findBone("leg-bottomr");

      // Bras — noms confirmés dans la console
      // upper arm = "for-arm-top" ou "first-arm-top"
      b.leftArmTop     = findBone("for-arm-topl", "first-arm-topl", "inside-arm-topl");
      b.leftArmBottom  = findBone("for-arm-bottoml", "first-arm-bottoml");
      b.rightArmTop    = findBone("for-arm-topr", "first-arm-topr", "inside-arm-topr");
      b.rightArmBottom = findBone("for-arm-bottomr", "first-arm-bottomr");

      // Overrides depuis App.jsx
      if (headBone)        b.head          = headBone;
      if (leftArmBoneTop)  b.leftArmTop    = leftArmBoneTop;
      if (leftArmBone)     b.leftArmBottom = leftArmBone;
      if (rightArmBoneTop) b.rightArmTop   = rightArmBoneTop;
      if (rightArmBone)    b.rightArmBottom= rightArmBone;

      // ✅ Sauvegarder rotations de repos pour toujours repartir de la bonne pose
      for (const key in b) {
        if (!b[key]) continue;
        b[key].userData.restY = b[key].position.y;
        b[key].userData.restZ = b[key].rotation.z;
        b[key].userData.restX = b[key].rotation.x;
      }

      console.log("✅ Bones assignés:", Object.fromEntries(
        Object.entries(b).map(([k, v]) => [k, v ? `✅ ${v.name}` : "❌ NOT FOUND"])
      ));

      // ✅ Init springs
      const S = (s, d) => new Spring(s, d);
      springsRef.current = {
        bodyLeanZ:      S(6,  0.55),
        bodyLeanX:      S(5,  0.55),
        bodyStretchY:   S(10, 0.6),
        headLagZ:       S(4,  0.5),
        headBobY:       S(8,  0.6),
        leftArmSwing:   S(4,  0.45),
        rightArmSwing:  S(4,  0.45),
        armsDropY:      S(5,  0.5),
        leftForeSwing:  S(3,  0.4),
        rightForeSwing: S(3,  0.4),
        leftLegSwing:   S(5,  0.5),
        rightLegSwing:  S(5,  0.5),
        legsSquash:     S(8,  0.6),
      };

      prevPosRef.current = {
        x: characterBody.position.x,
        y: characterBody.position.y,
        z: characterBody.position.z,
      };

      readyRef.current = true;

      return () => {
        readyRef.current = false;
        springsRef.current = null;
        bonesRef.current = {};
      };
    }, [model, world, characterBody, headBone, leftArmBone, rightArmBone, leftArmBoneTop, rightArmBoneTop]);

    return null;
  }
);

export default Skeleton;