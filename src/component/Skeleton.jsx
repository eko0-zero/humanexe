import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import {
  Body,
  Box,
  Vec3,
  HingeConstraint,
  PointToPointConstraint,
} from "cannon-es";

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
    ref,
  ) => {
    const bonesRef = useRef({});
    const bodiesRef = useRef({});
    const constraintsRef = useRef([]);

    // 6️⃣ Expose updateBones function to parent for manual update
    useImperativeHandle(ref, () => ({
      updateBones: () => {
        for (const key in bonesRef.current) {
          // skip bones controlled by spring animation (arms and head)
          if (
            key === "head" ||
            key === "leftArm" ||
            key === "rightArm" ||
            key === "leftArmTop" ||
            key === "rightArmTop"
          )
            continue;

          const bone = bonesRef.current[key];
          const body = bodiesRef.current[key];
          if (!bone || !body) continue;
          const parent = bone.parent;
          if (parent) parent.updateWorldMatrix(true, false);

          if (parent) {
            const parentInv = new THREE.Matrix4()
              .copy(parent.matrixWorld)
              .invert();

            const worldMatrix = new THREE.Matrix4().compose(
              new THREE.Vector3(
                body.position.x,
                body.position.y,
                body.position.z,
              ),
              new THREE.Quaternion(
                body.quaternion.x,
                body.quaternion.y,
                body.quaternion.z,
                body.quaternion.w,
              ),
              new THREE.Vector3(1, 1, 1),
            );

            const localMatrix = worldMatrix.premultiply(parentInv);

            const scale = new THREE.Vector3();
            localMatrix.decompose(bone.position, bone.quaternion, scale);
          } else {
            bone.position.copy(body.position);
            bone.quaternion.copy(body.quaternion);
          }
          bone.updateMatrixWorld(true);
        }
      },
    }));
    useEffect(() => {
      if (!model || !world || !characterBody) return;

      // 1️⃣ Récupération du skeleton
      let skeleton;

      model.traverse((o) => {
        if (o.isSkinnedMesh && o.skeleton) skeleton = o.skeleton;
      });
      if (!skeleton) return;
      console.log(skeleton.bones.map((b) => b.name));

      // 2️⃣ Trouver un bone par noms possibles
      const findBone = (names) => {
        for (const name of names) {
          const bone = skeleton.getBoneByName(name);
          if (bone) return bone;
        }
        return null;
      };

      const boneNames = {
        spine: ["body"],
        rightLegTop: ["leg-topr"],
        rightLegBottom: ["leg-bottomr"],
        leftLegTop: ["leg-topl"],
        leftLegBottom: ["leg-bottoml"],

        head: ["head"],

        rightArmTop: ["for-arm-topr"],
        rightArmBottom: ["for-arm-bottomr"],
        leftArmTop: ["for-arm-topl"],
        leftArmBottom: ["for-arm-bottoml"],

        rightForArmTop: ["first-arm-topr"],
        rightArmBottom: ["first-arm-bottomr"],
        leftForArmTop: ["first-arm-topl"],
        leftArmBottom: ["first-arm-bottoml"],
      };

      for (const key in boneNames) {
        bonesRef.current[key] = findBone(boneNames[key]);
      }

      // 3️⃣ Créer bodies Cannon.js pour chaque bone (spine and legs only)
      const createBody = (bone, mass = 0.5) => {
        if (!bone) return null;
        const size = new Vec3(0.08, 0.15, 0.08);
        const halfExtents = new Vec3(size.x / 2, size.y / 2, size.z / 2);
        const body = new Body({ mass });
        body.addShape(new Box(halfExtents));
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        bone.getWorldPosition(pos);
        bone.getWorldQuaternion(quat);
        body.position.set(pos.x, pos.y, pos.z);
        body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
        body.linearDamping = 0.4;
        body.angularDamping = 0.4;
        world.addBody(body);
        return body;
      };

      for (const key in bonesRef.current) {
        bodiesRef.current[key] = createBody(
          bonesRef.current[key],
          key.includes("Leg") ? 0.4 : 0.3,
        );
      }

      // 4️⃣ Lier le characterBody au spine (avec offset pour correspondre au torse)
      const spineBody = bodiesRef.current["spine"];
      if (spineBody) {
        // position approximative du torse par rapport au centre du characterBody
        const spineOffset = new Vec3(0, 0.5, 0);

        const constraint = new PointToPointConstraint(
          characterBody,
          spineOffset,
          spineBody,
          new Vec3(0, 0, 0),
        );

        world.addConstraint(constraint);
      }

      // 5️⃣ Ajouter contraintes entre les jambes uniquement pour créer un ragdoll partiel
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

      // jambe droite
      addHinge(
        "spine",
        "rightLegTop",
        new Vec3(0.15, -0.25, 0),
        new Vec3(0, 0.3, 0),
      );
      addHinge(
        "rightLegTop",
        "rightLegBottom",
        new Vec3(0, -0.3, 0),
        new Vec3(0, 0.3, 0),
      );

      // jambe gauche
      addHinge(
        "spine",
        "leftLegTop",
        new Vec3(-0.15, -0.25, 0),
        new Vec3(0, 0.3, 0),
      );
      addHinge(
        "leftLegTop",
        "leftLegBottom",
        new Vec3(0, -0.3, 0),
        new Vec3(0, 0.3, 0),
      );

      // Store bones for spring animation from props
      if (headBone) bonesRef.current.head = headBone;
      if (leftArmBone) bonesRef.current.leftArm = leftArmBone;
      if (rightArmBone) bonesRef.current.rightArm = rightArmBone;
      if (leftArmBoneTop) bonesRef.current.leftArmTop = leftArmBoneTop;
      if (rightArmBoneTop) bonesRef.current.rightArmTop = rightArmBoneTop;

      return () => {
        // cleanup constraints and bodies
        constraintsRef.current.forEach((c) => world.removeConstraint(c));
        constraintsRef.current.length = 0;
        for (const key in bodiesRef.current) {
          if (bodiesRef.current[key]) {
            world.removeBody(bodiesRef.current[key]);
          }
        }
        bodiesRef.current = {};
      };
    }, [
      model,
      world,
      characterBody,
      headBone,
      leftArmBone,
      rightArmBone,
      leftArmBoneTop,
      rightArmBoneTop,
    ]);

    return null;
  },
);

export default Skeleton;
