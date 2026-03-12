import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  Body,
  Box,
  Vec3,
  HingeConstraint,
  PointToPointConstraint,
} from "cannon-es";

const Skeleton = ({ model, world, characterBody }) => {
  const bonesRef = useRef({});
  const bodiesRef = useRef({});
  const constraintsRef = useRef([]);

  useEffect(() => {
    if (!model || !world || !characterBody) return;

    // 1️⃣ Récupération du skeleton
    let skeleton;
    model.traverse((o) => {
      if (o.isSkinnedMesh && o.skeleton) skeleton = o.skeleton;
    });
    if (!skeleton) return;

    // 2️⃣ Trouver un bone par noms possibles
    const findBone = (names) => {
      for (const name of names) {
        const bone = skeleton.getBoneByName(name);
        if (bone) return bone;
      }
      return null;
    };

    const boneNames = {
      head: ["Head", "head", "mixamorigHead"],
      spine: ["Spine", "spine", "Chest"],
      rightArmTop: ["RightArmTop", "upper_arm.R", "Arm_R"],
      rightArmBottom: ["RightArmBottom", "lower_arm.R"],
      leftArmTop: ["LeftArmTop", "upper_arm.L", "Arm_L"],
      leftArmBottom: ["LeftArmBottom", "lower_arm.L"],
      rightLegTop: ["RightLegTop", "upper_leg.R"],
      rightLegBottom: ["RightLegBottom", "lower_leg.R"],
      leftLegTop: ["LeftLegTop", "upper_leg.L"],
      leftLegBottom: ["LeftLegBottom", "lower_leg.L"],
    };

    for (const key in boneNames) {
      bonesRef.current[key] = findBone(boneNames[key]);
    }

    // 3️⃣ Créer bodies Cannon.js pour chaque bone
    const createBody = (bone, mass = 0.5) => {
      if (!bone) return null;
      const box = new THREE.Box3().setFromObject(bone);
      const size = new THREE.Vector3();
      box.getSize(size);
      const halfExtents = new Vec3(size.x / 2, size.y / 2, size.z / 2);
      const body = new Body({ mass });
      body.addShape(new Box(halfExtents));
      const pos = new THREE.Vector3();
      bone.getWorldPosition(pos);
      body.position.copy(pos);
      world.addBody(body);
      return body;
    };

    for (const key in bonesRef.current) {
      bodiesRef.current[key] = createBody(
        bonesRef.current[key],
        key.includes("Leg") ? 0.4 : 0.3,
      );
    }

    // 4️⃣ Lier le characterBody au spine
    const spineBody = bodiesRef.current["spine"];
    if (spineBody) {
      const constraint = new PointToPointConstraint(
        characterBody,
        new Vec3(0, 0, 0),
        spineBody,
        new Vec3(0, 0, 0),
      );
      world.addConstraint(constraint);
    }

    // 5️⃣ Ajouter contraintes entre bones (bras, jambes, tête)
    const addHinge = (A, B, pA, pB, axis = new Vec3(1, 0, 0)) => {
      const bodyA = bodiesRef.current[A];
      const bodyB = bodiesRef.current[B];
      if (!bodyA || !bodyB) return;
      const hinge = new HingeConstraint(bodyA, bodyB, {
        pivotA: pA,
        pivotB: pB,
        axisA: axis,
        axisB: axis,
      });
      world.addConstraint(hinge);
      constraintsRef.current.push(hinge);
    };

    addHinge("head", "rightArmTop", new Vec3(0, -0.1, 0), new Vec3(0, 0.15, 0));
    addHinge("head", "leftArmTop", new Vec3(0, -0.1, 0), new Vec3(0, 0.15, 0));
    addHinge(
      "rightArmTop",
      "rightArmBottom",
      new Vec3(0, -0.15, 0),
      new Vec3(0, 0.15, 0),
    );
    addHinge(
      "leftArmTop",
      "leftArmBottom",
      new Vec3(0, -0.15, 0),
      new Vec3(0, 0.15, 0),
    );
    addHinge(
      "rightLegTop",
      "rightLegBottom",
      new Vec3(0, -0.3, 0),
      new Vec3(0, 0.3, 0),
    );
    addHinge(
      "leftLegTop",
      "leftLegBottom",
      new Vec3(0, -0.3, 0),
      new Vec3(0, 0.3, 0),
    );

    // 6️⃣ Synchroniser bones avec bodies
    let animId;
    const updateBones = () => {
      for (const key in bonesRef.current) {
        const bone = bonesRef.current[key];
        const body = bodiesRef.current[key];
        if (!bone || !body) continue;
        bone.position.copy(body.position);
        bone.quaternion.copy(body.quaternion);
      }
      animId = requestAnimationFrame(updateBones);
    };
    updateBones();

    return () => cancelAnimationFrame(animId);
  }, [model, world, characterBody]);

  return null;
};

export default Skeleton;
