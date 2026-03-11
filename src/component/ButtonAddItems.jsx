import { useRef, useCallback, useState, useEffect } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { Body, Box, Vec3, Material, ContactMaterial, World } from "cannon-es";
import plus from "../assets/img/svg/plus.svg";

const ITEM_MATERIAL = new Material("itemMaterial");
const GROUND_Y = -1;

const ITEM_MODELS = [
  { name: "waffle", path: "./3D/models/waffle.glb", stats: { health: 10, weight: 1, speed: 3, rarity: 1 } },
  { name: "bat", path: "./3D/models/bat.glb", stats: { health: -15, weight: 2, speed: 2, rarity: 1 } },
  { name: "plushie", path: "./3D/models/plushie.glb", stats: { health: 5, weight: 1, speed: 5, rarity: 1 } },
  { name: "knife", path: "./3D/models/knife.glb", stats: { health: -25, weight: 3, speed: 1, rarity: 1 } },
];

let contactMaterialAdded = false;
function ensureContactMaterial(world) {
  if (contactMaterialAdded) return;
  const contact = new ContactMaterial(ITEM_MATERIAL, ITEM_MATERIAL, {
    friction: 0.6,
    restitution: 0.25,
    contactEquationStiffness: 1e7,
    contactEquationRelaxation: 3,
  });
  world.addContactMaterial(contact);
  contactMaterialAdded = true;
}

async function createSpawnedItem(scene, world, position, modelConfig) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      modelConfig.path,
      (gltf) => {
        const model = gltf.scene;
        model.position.copy(position);
        model.castShadow = true;
        model.receiveShadow = true;
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material) node.material = node.material.clone();
          }
        });
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const centerY = (box.min.y + box.max.y) / 2;
        const itemGroundOffset = centerY - box.min.y;

        const halfExtents = new Vec3(
          Math.max(size.x / 2, 0.05),
          Math.max(size.y / 2, 0.05),
          Math.max(size.z / 2, 0.05),
        );
        const shape = new Box(halfExtents);
        ensureContactMaterial(world);

        const body = new Body({
          mass: 1,
          material: ITEM_MATERIAL,
          linearDamping: 0.4,
          angularDamping: 0.8,
        });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);
        world.addBody(body);

        resolve({ mesh: model, body, size, groundOffset: itemGroundOffset, modelName: modelConfig.name, stats: modelConfig.stats });
      },
      undefined,
      (error) => reject(error)
    );
  });
}

export default function ButtonAddItem({ scene, world, spawnedItems, camera, renderer }) {
  const isLoadingRef = useRef(false);
  const [itemCount, setItemCount] = useState(0);

  // Calculer position juste sous le bouton
  const getSpawnPosition = useCallback(() => {
    const button = document.querySelector("button");
    if (!button || !camera) return new THREE.Vector3(0, 2, 0);

    const rect = button.getBoundingClientRect();
    const screenX = rect.left + rect.width / 2;
    const screenY = rect.bottom + 10;

    const ndcX = (screenX / window.innerWidth) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const spawnPos = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, spawnPos);

    spawnPos.y = GROUND_Y + 2.5; // un peu au-dessus du sol pour tomber
    spawnPos.z = 0;
    return spawnPos;
  }, [camera]);

  const handleClick = useCallback(async () => {
    if (!scene || !world || !spawnedItems || isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      const spawnPos = getSpawnPosition();
      const modelConfig = ITEM_MODELS[Math.floor(Math.random() * ITEM_MODELS.length)];
      const item = await createSpawnedItem(scene, world, spawnPos, modelConfig);
      spawnedItems.current.push(item);
      setItemCount(spawnedItems.current.length);
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingRef.current = false;
    }
  }, [scene, world, spawnedItems, getSpawnPosition]);

  // Animation pour suivre les corps physiques
  useEffect(() => {
    if (!renderer || !scene || !camera) return;
    const animate = () => {
      spawnedItems.current.forEach((item) => {
        item.mesh.position.copy(item.body.position);
        item.mesh.quaternion.copy(item.body.quaternion);
      });
      renderer.render(scene, camera);
      requestAnimationFrame(animate);

      const onItemMouseDown = (clientX, clientY) => {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const rect = rendererRef.current.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, cameraRef.current);

  for (let i = spawnedItemsRef.current.length - 1; i >= 0; i--) {
    const item = spawnedItemsRef.current[i];
    const intersects = raycaster.intersectObject(item.mesh, true);
    if (intersects.length > 0) {
      draggingItemRef.current = item;
      dragPlanePoint.current.copy(item.body.position);
      const target = intersects[0].point;
      dragOffset.current.set(
        item.body.position.x - target.x,
        item.body.position.y - target.y,
        0
      );
      item.body.mass = 0;
      item.body.updateMassProperties();
      item.body.velocity.set(0, 0, 0);
      item.body.angularVelocity.set(0, 0, 0);
      break;
    }

    window.addEventListener("mousedown", (e) => {
  const pos = e.touches?.[0] || e;
  onItemMouseDown(pos.clientX, pos.clientY);
});
window.addEventListener("mousemove", (e) => {
  const pos = e.touches?.[0] || e;
  onItemMouseMove(pos.clientX, pos.clientY);
});
window.addEventListener("mouseup", onItemMouseUp);

window.addEventListener("touchstart", (e) => {
  const pos = e.touches[0];
  onItemMouseDown(pos.clientX, pos.clientY);
}, { passive: false });

window.addEventListener("touchmove", (e) => {
  const pos = e.touches[0];
  onItemMouseMove(pos.clientX, pos.clientY);
}, { passive: false });

window.addEventListener("touchend", onItemMouseUp);

window.removeEventListener("mousedown", onItemMouseDown);
window.removeEventListener("mousemove", onItemMouseMove);
window.removeEventListener("mouseup", onItemMouseUp);
window.removeEventListener("touchstart", onItemMouseDown);
window.removeEventListener("touchmove", onItemMouseMove);
window.removeEventListener("touchend", onItemMouseUp);
  }
};

const onItemMouseMove = (clientX, clientY) => {
  if (!draggingItemRef.current) return;
  const target = getMouseOnPlane(
    clientX,
    clientY,
    cameraRef.current,
    rendererRef.current,
    dragPlanePoint.current
  );
  draggingItemRef.current.body.position.x = target.x + dragOffset.current.x;
  draggingItemRef.current.body.position.y = target.y + dragOffset.current.y;
  if (draggingItemRef.current.body.position.y < GROUND_Y + 0.05)
    draggingItemRef.current.body.position.y = GROUND_Y + 0.05;
};

const onItemMouseUp = () => {
  if (!draggingItemRef.current) return;
  draggingItemRef.current.body.mass = 1;
  draggingItemRef.current.body.updateMassProperties();
  draggingItemRef.current = null;
};
    };
    animate();
  }, [renderer, scene, camera, spawnedItems]);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleClick(); }}
      className="absolute top-[15vh] left-5 px-5 py-2 z-10 bg-white border-2 border-black rounded-[100px] flex items-center gap-3 font-host font-light text-[1.8rem]"
    >
      <img src={plus} alt="plus" />
      <span>add item</span>
    </button>
  );
}