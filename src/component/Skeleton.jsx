import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

class Spring {
  constructor(stiffness = 8, damping = 0.6) {
    this.baseSt    = stiffness;
    this.baseDamp  = damping;
    this.value     = 0;
    this.velocity  = 0;
    this.target    = 0;
    this.stiffness = stiffness;
    this.damping   = damping;
  }
  update(dt) {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity += force * dt;
    this.velocity *= 1 - this.damping * dt * 10;
    this.value += this.velocity * dt;
  }
  snapBack() {
    this.target    = 0;
    this.stiffness = this.baseSt * 6;
    this.damping   = 1;
  }
  restore() {
    this.stiffness = this.baseSt;
    this.damping   = this.baseDamp;
  }
}

const LEG_AXIS = "x";

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
      mouseWorld,
      isDragging,
    },
    ref
  ) => {
    const bonesRef       = useRef({});
    const springsRef     = useRef(null);
    const prevPosRef     = useRef({ x: 0, y: 0, z: 0 });
    const velocityRef    = useRef({ x: 0, y: 0, z: 0 });
    const lastTimeRef    = useRef(performance.now());
    const readyRef       = useRef(false);
    const wasDraggingRef = useRef(false);
    const snapTimerRef   = useRef(null);

    const applyLegRotation = (bone, restKey, value) => {
      if (!bone) return;
      const axis = LEG_AXIS.replace("-", "");
      const sign = LEG_AXIS.startsWith("-") ? -1 : 1;
      bone.rotation[axis] = (bone.userData[`rest${restKey}`] || 0) + sign * value;
    };

    useImperativeHandle(ref, () => ({
      updateBones: () => {
        if (!readyRef.current || !springsRef.current || !characterBody) return;

        const now = performance.now();
        const dt  = Math.min((now - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = now;

        const cx = characterBody.position.x;
        const cy = characterBody.position.y;

        const vx = (cx - prevPosRef.current.x) / dt;
        const vy = (cy - prevPosRef.current.y) / dt;

        velocityRef.current.x = velocityRef.current.x * 0.7 + vx * 0.3;
        velocityRef.current.y = velocityRef.current.y * 0.7 + vy * 0.3;
        prevPosRef.current    = { x: cx, y: cy, z: characterBody.position.z };

        const velX = THREE.MathUtils.clamp(velocityRef.current.x, -15, 15);
        const velY = THREE.MathUtils.clamp(velocityRef.current.y, -15, 15);

        const sp = springsRef.current;
        const b  = bonesRef.current;

        // Snap-back au relâchement
        const justReleased = wasDraggingRef.current && !isDragging;
        if (justReleased) {
          for (const key in sp) sp[key].snapBack();
          if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
          snapTimerRef.current = setTimeout(() => {
            if (!springsRef.current) return;
            for (const key in springsRef.current) springsRef.current[key].restore();
          }, 30);
        }
        wasDraggingRef.current = isDragging;
        
        // Boost retour au repos quand le perso est immobile (pas en drag)
const speed = Math.abs(velX) + Math.abs(velY);
const isIdle = !isDragging && speed < 0.8;
const IDLE_S = 50, IDLE_D = 0.9;
const bodyKeys = ["bodyLeanZ","bodyLeanX","bodyStretchY","leftArmSwing","rightArmSwing","armsDropY","leftForeSwing","rightForeSwing","leftLeg","rightLeg","headBobY"];
for (const key of bodyKeys) {
  if (!sp[key]) continue;
  if (isIdle) {
    sp[key].stiffness = IDLE_S;
    sp[key].damping   = IDLE_D;
  } else {
sp[key].stiffness = sp[key].baseSt;
sp[key].damping   = sp[key].baseDamp;
  }
}

        // TÊTE : suit directement le curseur
        if (isDragging && mouseWorld) {
          const offsetX = mouseWorld.x - characterBody.position.x;
          const offsetY = mouseWorld.y - characterBody.position.y;
          sp.headZ.target = THREE.MathUtils.clamp(-offsetX * 0.62, -0.92, 0.92);
          sp.headX.target = THREE.MathUtils.clamp( offsetY * 0.52, -0.78, 0.78);
        } else {
          sp.headZ.target = 0;
          sp.headX.target = 0;
        }
        sp.headBobY.target = -Math.abs(velY) * 0.035;

        // CORPS guidé par la tête
        const headLeadZ = sp.headZ.value;
        const headLeadX = sp.headX.value;
        sp.bodyLeanZ.target    =  velX * 0.38 + headLeadZ * 0.68;
        sp.bodyLeanX.target    =  velY * 0.38 + headLeadX * 0.52;
        sp.bodyStretchY.target = -Math.abs(velY) * 0.007;

        // BRAS
        sp.leftArmSwing.target   = -velX * 0.2  - headLeadZ * 0.22;
        sp.rightArmSwing.target  =  velX * 0.2  + headLeadZ * 0.22;
        sp.armsDropY.target      = -Math.abs(velX) * 0.045 + velY * 0.065;
        sp.leftForeSwing.target  = -velY * 0.95;
        sp.rightForeSwing.target =  velY * 0.95;

        // JAMBES
        sp.leftLeg.target  =  velX * 0.58;
        sp.rightLeg.target = -velX * 0.58;

        for (const key in sp) sp[key].update(dt);

        if (b.head) {
          b.head.rotation.z = (b.head.userData.restZ || 0) + sp.headZ.value;
          b.head.rotation.x = (b.head.userData.restX || 0) + sp.headX.value;
          b.head.position.y = (b.head.userData.restY || 0) + sp.headBobY.value;
        }
        if (b.neck) {
          b.neck.rotation.z = (b.neck.userData.restZ || 0) + sp.headZ.value * 0.6;
          b.neck.rotation.x = (b.neck.userData.restX || 0) + sp.headX.value * 0.5;
        }
        if (b.spine) {
          b.spine.rotation.z = (b.spine.userData.restZ || 0) + sp.bodyLeanZ.value;
          b.spine.rotation.x = (b.spine.userData.restX || 0) + sp.bodyLeanX.value;
          b.spine.scale.y    = 1 + sp.bodyStretchY.value;
        }
        if (b.leftArmTop) {
          b.leftArmTop.rotation.z = (b.leftArmTop.userData.restZ || 0) + sp.leftArmSwing.value;
          b.leftArmTop.rotation.x = (b.leftArmTop.userData.restX || 0) + sp.armsDropY.value;
        }
        if (b.leftArmBottom) {
          b.leftArmBottom.rotation.z = (b.leftArmBottom.userData.restZ || 0) + sp.leftForeSwing.value;
        }
        if (b.rightArmTop) {
          b.rightArmTop.rotation.z = (b.rightArmTop.userData.restZ || 0) + sp.rightArmSwing.value;
          b.rightArmTop.rotation.x = (b.rightArmTop.userData.restX || 0) - sp.armsDropY.value;
        }
        if (b.rightArmBottom) {
          b.rightArmBottom.rotation.z = (b.rightArmBottom.userData.restZ || 0) + sp.rightForeSwing.value;
        }

        applyLegRotation(b.leftLegTop,     LEG_AXIS === "x" ? "X" : LEG_AXIS === "y" ? "Y_rot" : "Z", sp.leftLeg.value);
        applyLegRotation(b.leftLegBottom,  LEG_AXIS === "x" ? "X" : LEG_AXIS === "y" ? "Y_rot" : "Z", sp.leftLeg.value * 0.5);
        applyLegRotation(b.rightLegTop,    LEG_AXIS === "x" ? "X" : LEG_AXIS === "y" ? "Y_rot" : "Z", sp.rightLeg.value);
        applyLegRotation(b.rightLegBottom, LEG_AXIS === "x" ? "X" : LEG_AXIS === "y" ? "Y_rot" : "Z", sp.rightLeg.value * 0.5);
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
      b.spine          = findBone("body");
      b.head           = findBone("head");
      b.neck           = findBone("neck");
      b.leftLegTop     = findBone("leg-topl");
      b.leftLegBottom  = findBone("leg-bottoml");
      b.rightLegTop    = findBone("leg-topr");
      b.rightLegBottom = findBone("leg-bottomr");
      b.leftArmTop     = findBone("for-arm-topl", "first-arm-topl", "inside-arm-topl");
      b.leftArmBottom  = findBone("for-arm-bottoml", "first-arm-bottoml");
      b.rightArmTop    = findBone("for-arm-topr", "first-arm-topr", "inside-arm-topr");
      b.rightArmBottom = findBone("for-arm-bottomr", "first-arm-bottomr");

      if (headBone)        b.head           = headBone;
      if (leftArmBoneTop)  b.leftArmTop     = leftArmBoneTop;
      if (leftArmBone)     b.leftArmBottom  = leftArmBone;
      if (rightArmBoneTop) b.rightArmTop    = rightArmBoneTop;
      if (rightArmBone)    b.rightArmBottom = rightArmBone;

      for (const key in b) {
        if (!b[key]) continue;
        b[key].userData.restY     = b[key].position.y;
        b[key].userData.restZ     = b[key].rotation.z;
        b[key].userData.restX     = b[key].rotation.x;
        b[key].userData.restY_rot = b[key].rotation.y;
      }

      const S = (s, d) => new Spring(s, d);
      springsRef.current = {
        headZ:          S(20,  0.5),
        headX:          S(18,  0.5),
        headBobY:       S(9,   0.58),
        bodyLeanZ:      S(4,   0.55),
        bodyLeanX:      S(3.5, 0.55),
        bodyStretchY:   S(10,  0.65),
        leftArmSwing:   S(3,   0.4),
        rightArmSwing:  S(3,   0.4),
        armsDropY:      S(4,   0.48),
        leftForeSwing:  S(2,   0.38),
        rightForeSwing: S(2,   0.38),
        leftLeg:        S(3,   0.4),
        rightLeg:       S(3,   0.4),
      };

      prevPosRef.current = {
        x: characterBody.position.x,
        y: characterBody.position.y,
        z: characterBody.position.z,
      };
      wasDraggingRef.current = false;
      readyRef.current = true;

      return () => {
        readyRef.current = false;
        springsRef.current = null;
        bonesRef.current = {};
        if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      };
    }, [model, world, characterBody, headBone, leftArmBone, rightArmBone, leftArmBoneTop, rightArmBoneTop]);

    return null;
  }
);

export default Skeleton;