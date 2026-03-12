import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { World, Vec3, Body, Plane, Box } from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let isModelReady = false;
let animationManager = null;
let headBody = null;
let rightArmBody = null;
let leftArmBody = null;
let bonePhysicsStarted = false;

// Helper to find a bone by trying several possible names
function findBone(skeleton, names) {
  for (const name of names) {
    const b = skeleton.getBoneByName(name);
    if (b) return b;
  }

  // fallback: case-insensitive search
  const lower = names.map((n) => n.toLowerCase());
  return skeleton.bones.find((b) => lower.includes(b.name.toLowerCase()));
}

loadModel(scene, placeholder)
  .then((model) => {
    mesh = model;
    meshRef.current = mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    box.getSize(modelSize);
    modelSizeRef.current.copy(modelSize);

    mesh.traverse((o) => {
      if (o.isSkinnedMesh && o.skeleton) {
        skeleton = o.skeleton;
      }
    });

    if (skeleton) {
      console.log(
        "Skeleton bones:",
        skeleton.bones.map((b) => b.name),
      );

      // torso / reference bone
      testBone = findBone(skeleton, ["body"]);

      // head
      headBone = findBone(skeleton, ["head"]);
      skeleton.bones[0];

      // right arm
      ForRightArmBoneTop = findBone(skeleton, ["for-arm-top.r"]);
      rightArmBoneTop = findBone(skeleton, ["first-arm-top.r"]);

      rightArmBoneBottom = findBone(skeleton, [
        "for-arm-bottom.r",
        "first-arm-bottom.r",
      ]);

      // left arm
      ForLeftArmBoneTop = findBone(skeleton, ["for-arm-top.l"]);
      leftArmBoneTop = findBone(skeleton, ["first-arm-top.l"]);

      leftArmBoneBottom = findBone(skeleton, [
        "for-arm-bottom.l",
        "first-arm-bottom.l",
      ]);

      // legs
      rightLegTop = findBone(skeleton, ["leg-top.r"]);
      rightLegBottom = findBone(skeleton, ["leg-bottom.r"]);
      leftLegTop = findBone(skeleton, ["leg-top.l"]);
      leftLegBottom = findBone(skeleton, ["leg-bottom.l"]);

      // store rest rotations for animation reset
      if (leftArmBone) leftArmRest.copy(leftArmBone.rotation);
      if (leftArmBoneTop) leftArmRestTop.copy(leftArmBoneTop.rotation);
      if (rightArmBone) rightArmRest.copy(rightArmBone.rotation);
      if (rightArmBoneTop) rightArmRestTop.copy(rightArmBoneTop.rotation);

      // --- Basic physics bodies for some bones (simple ragdoll start) ---
      if (typeof world !== "undefined") {
        if (headBone) {
          headBody = new Body({
            mass: 0.5,
            shape: new Box(new Vec3(0.15, 0.15, 0.15)),
          });
          world.addBody(headBody);
        }

        if (rightArmBoneTop) {
          rightArmBody = new Body({
            mass: 0.3,
            shape: new Box(new Vec3(0.12, 0.25, 0.12)),
          });
          world.addBody(rightArmBody);
        }

        if (leftArmBoneTop) {
          leftArmBody = new Body({
            mass: 0.3,
            shape: new Box(new Vec3(0.12, 0.25, 0.12)),
          });
          world.addBody(leftArmBody);
        }

        if (!bonePhysicsStarted) {
          bonePhysicsStarted = true;

          const updateBonePhysics = () => {
            if (headBone && headBody) {
              headBody.position.copy(
                headBone.getWorldPosition(new THREE.Vector3()),
              );
              headBone.position.copy(headBody.position);
            }

            if (rightArmBoneTop && rightArmBody) {
              rightArmBody.position.copy(
                rightArmBoneTop.getWorldPosition(new THREE.Vector3()),
              );
              rightArmBoneTop.position.copy(rightArmBody.position);
            }

            if (leftArmBoneTop && leftArmBody) {
              leftArmBody.position.copy(
                leftArmBoneTop.getWorldPosition(new THREE.Vector3()),
              );
              leftArmBoneTop.position.copy(leftArmBody.position);
            }

            requestAnimationFrame(updateBonePhysics);
          };

          updateBonePhysics();
        }
      }
    }

    mesh.position.set(
      characterBody.position.x,
      characterBody.position.y + MODEL_Y_OFFSET,
      characterBody.position.z,
    );

    // === ✅ INITIALISER ANIMATIONMANAGER APRÈS QUE LE MODÈLE SOIT CHARGÉ ===
    animationManager = new AnimationManager(
      scene,
      mesh,
      skeleton,
      healthManager,
    );
    animationManagerRef.current = animationManager;
    isModelReady = true; // ✅ MARQUER QUE LE MODÈLE EST PRÊT

    console.log("✅ Modèle principal chargé et AnimationManager initialisé");
    setIsReady(true);
  })
  .catch((err) => {
    console.error("Erreur chargement modèle principal:", err);
    setIsReady(true);
  });

renderer.render(scene, camera);
