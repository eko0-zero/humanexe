import { useEffect, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

const TRASH_PATH = "./3D/models/trash.glb";
const TRASH_Z_POSITION = 0.37;
const BASE_SCALE = 0.8;
const HOVER_SCALE = 0.85;
const GROUND_Y = -1.15;

export default function Trash({
  scene,
  camera,
  spawnedItems,
  world,
  renderer,
}) {
  const trashRef = useRef(null);
  const trashBoundsRef = useRef({
    position: new THREE.Vector3(),
    size: new THREE.Vector3(0.5, 0.5, 0.5),
  });

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isHoveredRef = useRef(false);

  // =========================
  // Chargement du modèle
  // =========================
  useEffect(() => {
    if (!scene || !camera) return;

    const loader = new GLTFLoader();

    loader.load(
      TRASH_PATH,
      (gltf) => {
        const trash = gltf.scene;

        trash.castShadow = true;
        trash.receiveShadow = true;

        trash.position.set(100, GROUND_Y + 0.2, TRASH_Z_POSITION);
        trash.scale.setScalar(BASE_SCALE);
        trash.rotation.set(6.1, Math.PI / 2, 0);

        trash.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;

            if (node.material) {
              node.material = node.material.clone();
            }
          }
        });

        const box = new THREE.Box3().setFromObject(trash);

        trashBoundsRef.current = {
          position: trash.position.clone(),
          size: box.getSize(new THREE.Vector3()),
        };

        scene.add(trash);
        trashRef.current = trash;

        console.log("✅ Trash chargé");
      },
      undefined,
      (err) => {
        console.error("Erreur chargement trash:", err);
      },
    );
  }, [scene, camera]);

  // =========================
  // Positionnement + Scale
  // =========================
  useEffect(() => {
    if (!renderer || !camera) return;

    const updateTrash = () => {
      if (!trashRef.current) return;

      const distance = camera.position.z;
      const vFov = THREE.MathUtils.degToRad(camera.fov);

      const viewHeight = 2 * Math.tan(vFov / 2) * distance;
      const viewWidth = viewHeight * camera.aspect;

      trashRef.current.position.x = viewWidth / 1.8 - 0.35;
      trashRef.current.position.y = GROUND_Y + 0.185;
      trashRef.current.position.z = TRASH_Z_POSITION;

      const targetScale = isHoveredRef.current ? HOVER_SCALE : BASE_SCALE;

      const smoothScale = THREE.MathUtils.lerp(
        trashRef.current.scale.x,
        targetScale,
        0.1,
      );

      trashRef.current.scale.setScalar(smoothScale);

      trashBoundsRef.current.position.copy(trashRef.current.position);
    };

    const originalRender = renderer.render.bind(renderer);

    renderer.render = function (scene, camera) {
      updateTrash();
      checkCollisions();
      return originalRender(scene, camera);
    };

    const checkCollisions = () => {
      if (!trashRef.current) return;
      if (!spawnedItems.current.length) return;

      const trashPos = trashRef.current.position;
      const trashSize = trashBoundsRef.current.size;

      const trashRadius = Math.max(trashSize.x, trashSize.y, trashSize.z) / 2;

      for (let i = spawnedItems.current.length - 1; i >= 0; i--) {
        const item = spawnedItems.current[i];

        if (!item.body) continue;

        const itemPos = item.body.position;

        const distance = trashPos.distanceTo(itemPos);

        if (distance < trashRadius + 0.15) {
          if (item.mesh && item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
          }

          if (item.body && world) {
            world.removeBody(item.body);
          }

          spawnedItems.current.splice(i, 1);
        }
      }
    };

    return () => {
      renderer.render = originalRender;
    };
  }, [renderer, camera, spawnedItems, world]);

  // =========================
  // Hover detection
  // =========================
  useEffect(() => {
    if (!renderer || !camera) return;

    const onMouseMove = (e) => {
      if (!trashRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();

      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;

      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const intersects = raycasterRef.current.intersectObject(
        trashRef.current,
        true,
      );

      isHoveredRef.current = intersects.length > 0;
    };

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [renderer, camera]);

  // =========================
  // Click pour supprimer
  // =========================
  useEffect(() => {
    if (!renderer || !camera) return;

    const onClick = () => {
      if (!trashRef.current) return;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const intersects = raycasterRef.current.intersectObject(
        trashRef.current,
        true,
      );

      if (intersects.length > 0) {
        spawnedItems.current.forEach((item) => {
          if (item.mesh && item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
          }

          if (item.body && world) {
            world.removeBody(item.body);
          }
        });

        spawnedItems.current = [];
      }
    };

    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("click", onClick);
    };
  }, [renderer, camera, spawnedItems, world]);

  return null;
}
