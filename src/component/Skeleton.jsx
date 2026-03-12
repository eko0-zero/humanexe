import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import {
  Body,
  Box,
  Vec3,
  HingeConstraint,
  PointToPointConstraint,
  ConeTwistConstraint,
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
    ref
  ) => {
    const bonesRef = useRef({});
    const bodiesRef = useRef({});
    const constraintsRef = useRef([]);

    // 3️⃣ Update des bones exposé au parent
    useImperativeHandle(ref, () => ({
      updateBones: () => {
        for (const key in bonesRef.current) {
          // 🔹 Ignorer les bones animés par spring
          if (["head", "leftArm", "rightArm", "leftArmTop", "rightArmTop"].includes(key)) continue;

          const bone = bonesRef.current[key];
          const body = bodiesRef.current[key];
          if (!bone || !body) continue;

          const parent = bone.parent;
          if (parent) parent.updateWorldMatrix(true, false);

          if (parent) {
            const parentInv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
            const worldMatrix = new THREE.Matrix4().compose(
              new THREE.Vector3(body.position.x, body.position.y, body.position.z),
              new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
              new THREE.Vector3(1, 1, 1)
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

      // Récupérer le skeleton
      let skeleton;
      model.traverse((o) => {
        if (o.isSkinnedMesh && o.skeleton) skeleton = o.skeleton;
      });
      if (!skeleton) return;

      console.log("Bones disponibles :", skeleton.bones.map((b) => b.name));

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
        rightForArmBottom: ["first-arm-bottomr"],
        leftForArmTop: ["first-arm-topl"],
        leftForArmBottom: ["first-arm-bottoml"],
      };

      // Associer les bones
      for (const key in boneNames) {
        bonesRef.current[key] = findBone(boneNames[key]);
      }

      // Créer les bodies
      const createBody = (bone, mass = 1) => {
        if (!bone) return null;
        const size = new Vec3(0.08, 0.15, 0.08); // Ajuster si nécessaire
        const halfExtents = new Vec3(size.x / 2, size.y / 2, size.z / 2);
        const body = new Body({ mass });
        body.addShape(new Box(halfExtents));

        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        bone.getWorldPosition(pos);
        bone.getWorldQuaternion(quat);

        body.position.set(pos.x, pos.y, pos.z);
        body.quaternion.set(quat.x, quat.y, quat.z, quat.w);

        // 4️⃣ Stabilité
        body.linearDamping = 0.5;  // Plus stable
        body.angularDamping = 0.5;

        world.addBody(body);
        return body;
      };

      // Bodies exemples
      bodiesRef.current["spine"] = createBody(bonesRef.current["spine"], 2);
      bodiesRef.current["head"] = createBody(bonesRef.current["head"], 0.6);
      bodiesRef.current["rightLegTop"] = createBody(bonesRef.current["rightLegTop"], 0.8);
      bodiesRef.current["rightLegBottom"] = createBody(bonesRef.current["rightLegBottom"], 0.6);
      bodiesRef.current["leftLegTop"] = createBody(bonesRef.current["leftLegTop"], 0.8);
      bodiesRef.current["leftLegBottom"] = createBody(bonesRef.current["leftLegBottom"], 0.6);

      bodiesRef.current["rightArmTop"] = createBody(bonesRef.current["rightArmTop"], 0.8);
      bodiesRef.current["rightForArmTop"] = createBody(bonesRef.current["rightForArmTop"], 0.6);
      bodiesRef.current["rightArmBottom"] = createBody(bonesRef.current["rightArmBottom"], 0.8);
      bodiesRef.current["rightForArmBottom"] = createBody(bonesRef.current["rightForArmBottom"], 0.6);

      bodiesRef.current["leftArmTop"] = createBody(bonesRef.current["leftArmTop"], 0.8);
      bodiesRef.current["leftForArmTop"] = createBody(bonesRef.current["leftForArmTop"], 0.6);
      bodiesRef.current["leftArmBottom"] = createBody(bonesRef.current["leftArmBottom"], 0.8);
      bodiesRef.current["leftForArmBottom"] = createBody(bonesRef.current["leftForArmBottom"], 0.6);

      // Contraintes hinge pour jambes
      const addHinge = (A, B, pA, pB, axis = new Vec3(1, 0, 0)) => {
        const bodyA = bodiesRef.current[A];
        const bodyB = bodiesRef.current[B];
        if (!bodyA || !bodyB) return;
        const hinge = new HingeConstraint(bodyA, bodyB, { pivotA: pA, pivotB: pB, axisA: axis, axisB: axis });
        world.addConstraint(hinge);
        constraintsRef.current.push(hinge);
      };

      addHinge("spine", "rightLegTop", new Vec3(0.15, -0.25, 0), new Vec3(0, 0.3, 0));
      addHinge("rightLegTop", "rightLegBottom", new Vec3(0, -0.3, 0), new Vec3(0, 0.3, 0));

      addHinge("spine", "leftLegTop", new Vec3(-0.15, -0.25, 0), new Vec3(0, 0.3, 0));
      addHinge("leftLegTop", "leftLegBottom", new Vec3(0, -0.3, 0), new Vec3(0, 0.3, 0));

      // ConeTwist pour le torse
      const cone = new ConeTwistConstraint(characterBody, bodiesRef.current["spine"], {
        pivotA: new Vec3(0, 0.5, 0),
        pivotB: new Vec3(0, 0, 0),
        axisA: new Vec3(0, 1, 0),
        axisB: new Vec3(0, 1, 0),
        angle: Math.PI / 4,
        twistAngle: Math.PI / 8,
      });
      world.addConstraint(cone);
      constraintsRef.current.push(cone);

      // Store bones animés
      if (headBone) bonesRef.current.head = headBone;
      if (leftArmBone) bonesRef.current.leftArm = leftArmBone;
      if (rightArmBone) bonesRef.current.rightArm = rightArmBone;
      if (leftArmBoneTop) bonesRef.current.leftArmTop = leftArmBoneTop;
      if (rightArmBoneTop) bonesRef.current.rightArmTop = rightArmBoneTop;

      // Cleanup
      return () => {
        constraintsRef.current.forEach((c) => world.removeConstraint(c));
        constraintsRef.current.length = 0;
        for (const key in bodiesRef.current) {
          if (bodiesRef.current[key]) world.removeBody(bodiesRef.current[key]);
        }
        bodiesRef.current = {};
      };
    }, [model, world, characterBody, headBone, leftArmBone, rightArmBone, leftArmBoneTop, rightArmBoneTop]);

    return null;
  }
);

export default Skeleton;