import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

class Spring {
  constructor(stiffness = 8, damping = 0.6) {
    this.baseSt = stiffness;
    this.baseDamp = damping;
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
  snapBack() {
    this.target = 0;
    this.stiffness = this.baseSt * 6;
    this.damping = 1;
  }
  restore() {
    this.stiffness = this.baseSt;
    this.damping = this.baseDamp;
  }
  hardReset() {
    this.value = 0;
    this.velocity = 0;
    this.target = 0;
  }
}

const LEG_AXIS = "x";

const Skeleton = forwardRef(({ model, world, characterBody }, ref) => {
  const bonesRef = useRef({});
  const springsRef = useRef(null);
  const prevPosRef = useRef({ x: 0, y: 0, z: 0 });
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastTimeRef = useRef(performance.now());
  const readyRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const snapTimerRef = useRef(null);
  const frozenRef = useRef(false);

  const applyLegRotation = (bone, value) => {
    if (!bone) return;
    bone.rotation[LEG_AXIS] = (bone.userData.restX || 0) + value;
  };

  const applyQuatDelta = (bone, dx, dy, dz, order = "ZXY") => {
    if (!bone) return;
    const restQ = bone.userData.restQuaternion;
    if (!restQ) return;
    const deltaQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(dx, dy, dz, order),
    );
    bone.quaternion.multiplyQuaternions(restQ, deltaQ);
  };

  const captureRestPose = () => {
    const b = bonesRef.current;
    for (const key in b) {
      if (!b[key]) continue;
      b[key].userData.restY = b[key].position.y;
      b[key].userData.restZ = b[key].rotation.z;
      b[key].userData.restX = b[key].rotation.x;
      b[key].userData.restY_rot = b[key].rotation.y;
      b[key].userData.restQuaternion = b[key].quaternion.clone();
    }
  };

  useImperativeHandle(ref, () => ({
    captureRestPose,

    // isDragging et mouseWorld passes en arguments depuis animate() dans App.jsx
    updateBones: (isDragging, mouseWorld) => {
      if (!readyRef.current || !springsRef.current || !characterBody) return;
      if (frozenRef.current) return;

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
      const b = bonesRef.current;

      const justReleased = wasDraggingRef.current && !isDragging;
      if (justReleased) {
        for (const key in sp) sp[key].snapBack();
        if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
        snapTimerRef.current = setTimeout(() => {
          if (!springsRef.current) return;
          for (const key in springsRef.current)
            springsRef.current[key].restore();
        }, 30);
      }
      wasDraggingRef.current = isDragging;

      const speed = Math.abs(velX) + Math.abs(velY);
      const isIdle = !isDragging && speed < 0.8;
      const IDLE_S = 50,
        IDLE_D = 0.9;
      const bodyKeys = [
        "bodyLeanZ",
        "bodyLeanX",
        "bodyStretchY",
        "leftArmSwing",
        "rightArmSwing",
        "armsDropY",
        "leftForeSwing",
        "rightForeSwing",
        "leftLeg",
        "rightLeg",
        "headBobY",
      ];
      for (const key of bodyKeys) {
        if (!sp[key]) continue;
        if (isIdle) {
          sp[key].stiffness = IDLE_S;
          sp[key].damping = IDLE_D;
        } else {
          sp[key].stiffness = sp[key].baseSt;
          sp[key].damping = sp[key].baseDamp;
        }
      }

      // Tete fixe pendant le drag
      sp.headZ.target = 0;
      sp.headX.target = 0;
      sp.headBobY.target = -Math.abs(velY) * 0.035;

      const headLeadZ = sp.headZ.value;
      const headLeadX = sp.headX.value;
      sp.bodyLeanZ.target = velX * 0.38 + headLeadZ * 0.68;
      sp.bodyLeanX.target = velY * 0.38 + headLeadX * 0.52;
      sp.bodyStretchY.target = -Math.abs(velY) * 0.007;

      sp.leftArmSwing.target = -velX * 0.2 - headLeadZ * 0.22;
      sp.rightArmSwing.target = velX * 0.2 + headLeadZ * 0.22;
      sp.armsDropY.target = -Math.abs(velX) * 0.045 + velY * 0.065;
      sp.leftForeSwing.target = -velY * 0.95;
      sp.rightForeSwing.target = velY * 0.95;

      sp.leftLeg.target = velX * 0.58;
      sp.rightLeg.target = -velX * 0.58;

      for (const key in sp) sp[key].update(dt);

      // Tete
      if (b.head) {
        b.head.rotation.z = (b.head.userData.restZ || 0) + sp.headZ.value;
        b.head.rotation.x = (b.head.userData.restX || 0) + sp.headX.value;
        b.head.position.y = (b.head.userData.restY || 0) + sp.headBobY.value;
      }
      if (b.neck) {
        b.neck.rotation.z = (b.neck.userData.restZ || 0) + sp.headZ.value * 0.6;
        b.neck.rotation.x = (b.neck.userData.restX || 0) + sp.headX.value * 0.5;
      }

      // Corps
      if (b.spine) {
        b.spine.rotation.z = (b.spine.userData.restZ || 0) + sp.bodyLeanZ.value;
        b.spine.rotation.x = (b.spine.userData.restX || 0) + sp.bodyLeanX.value;
        b.spine.scale.y = 1 + sp.bodyStretchY.value;
      }

      // Bras gauche
      applyQuatDelta(b.leftArmInside, 0, sp.leftArmSwing.value * 0.4, 0, "YXZ");
      applyQuatDelta(
        b.leftArmTop,
        sp.armsDropY.value,
        0,
        sp.leftArmSwing.value,
        "ZXY",
      );
      if (b.leftArmBottom) {
        b.leftArmBottom.rotation.z =
          (b.leftArmBottom.userData.restZ || 0) + sp.leftForeSwing.value;
      }

      // Bras droit
      applyQuatDelta(
        b.rightArmInside,
        0,
        sp.rightArmSwing.value * 0.4,
        0,
        "YXZ",
      );
      applyQuatDelta(
        b.rightArmTop,
        -sp.armsDropY.value,
        0,
        sp.rightArmSwing.value,
        "ZXY",
      );
      if (b.rightArmBottom) {
        b.rightArmBottom.rotation.z =
          (b.rightArmBottom.userData.restZ || 0) + sp.rightForeSwing.value;
      }

      // Jambes
      applyLegRotation(b.leftLegTop, sp.leftLeg.value);
      applyLegRotation(b.leftLegBottom, sp.leftLeg.value * 0.5);
      applyLegRotation(b.rightLegTop, sp.rightLeg.value);
      applyLegRotation(b.rightLegBottom, sp.rightLeg.value * 0.5);
    },

    freezeSprings: () => {
      frozenRef.current = true;
      const sp = springsRef.current;
      if (!sp) return;
      for (const key in sp) sp[key].hardReset();
    },

    unfreezeSprings: () => {
      frozenRef.current = false;
      if (springsRef.current && characterBody) {
        prevPosRef.current = {
          x: characterBody.position.x,
          y: characterBody.position.y,
          z: characterBody.position.z,
        };
        velocityRef.current = { x: 0, y: 0, z: 0 };
      }
      lastTimeRef.current = performance.now();
    },
  }));

  useEffect(() => {
    if (!model || !world || !characterBody) return;

    let skeleton;
    model.traverse((o) => {
      if (o.isSkinnedMesh && o.skeleton && !skeleton) {
        skeleton = o.skeleton;
      }
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

    // Corps — noms avec suffixe _1 (character-2.glb), fallback sans suffixe
    b.spine = findBone("body_1", "body");
    b.head = findBone("head_1", "head");
    b.neck = findBone("neck_1", "neck");

    // Bras gauche
    b.leftArmInside = findBone("inside-arm-topl_1", "inside-arm-topl");
    b.leftArmTop = findBone("for-arm-topl_1", "for-arm-topl");
    b.leftArmBottom = findBone(
      "for-arm-bottoml_1",
      "first-arm-bottoml_1",
      "inside-arm-bottoml_1",
      "for-arm-bottoml",
      "first-arm-bottoml",
      "inside-arm-bottoml",
    );

    // Bras droit
    b.rightArmInside = findBone("inside-arm-topr_1", "inside-arm-topr");
    b.rightArmTop = findBone("for-arm-topr_1", "for-arm-topr");
    b.rightArmBottom = findBone(
      "for-arm-bottomr_1",
      "first-arm-bottomr_1",
      "inside-arm-bottomr_1",
      "for-arm-bottomr",
      "first-arm-bottomr",
      "inside-arm-bottomr",
    );

    // Jambes
    b.leftLegTop = findBone("leg-topl_1", "leg-topl");
    b.leftLegBottom = findBone("leg-bottoml_1", "leg-bottoml");
    b.rightLegTop = findBone("leg-topr_1", "leg-topr");
    b.rightLegBottom = findBone("leg-bottomr_1", "leg-bottomr");

    // Capture initiale au repos
    for (const key in b) {
      if (!b[key]) continue;
      b[key].userData.restY = b[key].position.y;
      b[key].userData.restZ = b[key].rotation.z;
      b[key].userData.restX = b[key].rotation.x;
      b[key].userData.restY_rot = b[key].rotation.y;
      b[key].userData.restQuaternion = b[key].quaternion.clone();
    }

    const S = (s, d) => new Spring(s, d);
    springsRef.current = {
      headZ: S(20, 0.5),
      headX: S(18, 0.5),
      headBobY: S(9, 0.58),
      bodyLeanZ: S(4, 0.55),
      bodyLeanX: S(3.5, 0.55),
      bodyStretchY: S(10, 0.65),
      leftArmSwing: S(3, 0.4),
      rightArmSwing: S(3, 0.4),
      armsDropY: S(4, 0.48),
      leftForeSwing: S(2, 0.38),
      rightForeSwing: S(2, 0.38),
      leftLeg: S(3, 0.4),
      rightLeg: S(3, 0.4),
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
  }, [model, world, characterBody]);

  return null;
});

export default Skeleton;
