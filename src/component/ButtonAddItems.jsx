import { useRef, useCallback, useState, useEffect } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { Body, Box, Vec3, Material, ContactMaterial } from "cannon-es";
import plus from "../assets/img/svg/plus.svg";

const ITEM_MATERIAL = new Material("itemMaterial");
const GROUND_Y = -1;
const LOCKED_Z = 0.2;
// limits will be computed dynamically from the viewport
let VIEW_MIN_X = -6;
let VIEW_MAX_X = 6;
let VIEW_MIN_Y = GROUND_Y;
let VIEW_MAX_Y = 6;
let groundBodyAdded = false;

const loader = new GLTFLoader();
const modelCache = {};

const ITEM_MODELS = [
  {
    name: "waffle",
    path: "./3D/models/waffle.glb",
    stats: { health: 10, weight: 1, speed: 3, rarity: 1 },
  },
  {
    name: "bat",
    path: "./3D/models/bat.glb",
    stats: { health: -15, weight: 2, speed: 2, rarity: 1 },
  },
  {
    name: "plushie",
    path: "./3D/models/plushie.glb",
    stats: { health: 5, weight: 1, speed: 5, rarity: 1 },
  },
  {
    name: "knife",
    path: "./3D/models/knife.glb",
    stats: { health: -25, weight: 3, speed: 1, rarity: 1 },
  },
];

let contactMaterialAdded = false;

function ensureContactMaterial(world) {
  if (!contactMaterialAdded) {
    const contact = new ContactMaterial(ITEM_MATERIAL, ITEM_MATERIAL, {
      friction: 0.6,
      restitution: 0.25,
    });
    world.addContactMaterial(contact);
    contactMaterialAdded = true;
  }

  if (!groundBodyAdded) {
    const groundShape = new Box(new Vec3(50, 1, 50));
    const groundBody = new Body({
      mass: 0,
      material: ITEM_MATERIAL,
    });

    groundBody.addShape(groundShape);
    groundBody.position.set(0, GROUND_Y - 1, LOCKED_Z);

    world.addBody(groundBody);
    groundBodyAdded = true;
  }
}

async function loadModel(path) {
  if (modelCache[path]) return modelCache[path];

  const gltf = await loader.loadAsync(path);
  gltf.scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = false; // match App
      node.material = node.material.clone();
      node.material.shadowSide = THREE.FrontSide;
      node.geometry.computeVertexNormals(); // corrige artefacts
    }
  });

  modelCache[path] = gltf.scene;
  return gltf.scene;
}

async function createSpawnedItem(scene, world, position, modelConfig) {
  const baseModel = await loadModel(modelConfig.path);
  const model = baseModel.clone(true);

  model.position.copy(position);
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());

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
  body.position.set(position.x, position.y, LOCKED_Z);

  // verrou axe Z et rotations
  body.linearFactor.set(1, 1, 0);
  body.angularFactor.set(0, 0, 1);

  world.addBody(body);

  const item = {
    mesh: model,
    body,
    modelName: modelConfig.name,
    stats: modelConfig.stats,
  };

  // lien direct mesh → item
  model.userData.itemRef = item;

  return item;
}

export default function ButtonAddItem({
  scene,
  world,
  spawnedItems,
  camera,
  renderer,
}) {
  const isLoadingRef = useRef(false);
  const [itemCount, setItemCount] = useState(0);

  const draggingItemRef = useRef(null);
  const dragOffset = useRef(new THREE.Vector3());

  const rendererRef = useRef(renderer);
  const cameraRef = useRef(camera);

  const pickableMeshes = useRef([]);

  useEffect(() => {
    rendererRef.current = renderer;
  }, [renderer]);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const getSpawnPosition = useCallback(() => {
    const button = document.querySelector("button");
    if (!button) return new THREE.Vector3(0, 2, 0);

    const rect = button.getBoundingClientRect();

    const ndcX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
    const ndcY = -((rect.bottom + 10) / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const pos = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, pos);

    pos.y = GROUND_Y + 2.5;
    pos.z = LOCKED_Z;

    return pos;
  }, []);

  const handleClick = useCallback(async () => {
    if (!scene || !world || isLoadingRef.current) return;

    isLoadingRef.current = true;

    try {
      const spawnPos = getSpawnPosition();
      const modelConfig =
        ITEM_MODELS[Math.floor(Math.random() * ITEM_MODELS.length)];
      const item = await createSpawnedItem(scene, world, spawnPos, modelConfig);

      spawnedItems.current.push(item);
      pickableMeshes.current.push(item.mesh);
      setItemCount(spawnedItems.current.length);
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingRef.current = false;
    }
  }, [scene, world, getSpawnPosition, spawnedItems]);

  const getMouseWorld = (x, y) => {
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -LOCKED_Z);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, point);
    return point;
  };

  const updateViewportBounds = () => {
    const cam = cameraRef.current;
    if (!cam) return;

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -LOCKED_Z);

    const corners = [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(-1, 1),
      new THREE.Vector2(1, 1),
    ];

    const points = [];

    corners.forEach((c) => {
      raycaster.setFromCamera(c, cam);
      const p = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, p);
      points.push(p);
    });

    VIEW_MIN_X = Math.min(...points.map((p) => p.x));
    VIEW_MAX_X = Math.max(...points.map((p) => p.x));
    VIEW_MIN_Y = Math.max(GROUND_Y, Math.min(...points.map((p) => p.y)));
    VIEW_MAX_Y = Math.max(...points.map((p) => p.y));
  };

  const onMouseDown = (x, y) => {
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const hits = raycaster.intersectObjects(pickableMeshes.current, true);
    if (!hits.length) return;

    let obj = hits[0].object;
    while (obj && !obj.userData.itemRef) obj = obj.parent;
    if (!obj) return;

    const item = obj.userData.itemRef;
    draggingItemRef.current = item;

    const point = getMouseWorld(x, y);
    dragOffset.current.set(
      item.body.position.x - point.x,
      item.body.position.y - point.y,
      0,
    );

    item.body.mass = 0;
    item.body.updateMassProperties();
    item.body.velocity.set(0, 0, 0);
    item.body.angularVelocity.set(0, 0, 0);
  };

  const onMouseMove = (x, y) => {
    if (!draggingItemRef.current) return;
    const point = getMouseWorld(x, y);
    const body = draggingItemRef.current.body;

    const targetX = point.x + dragOffset.current.x;
    const targetY = point.y + dragOffset.current.y;

    updateViewportBounds();

    body.position.x = Math.min(Math.max(targetX, VIEW_MIN_X), VIEW_MAX_X);
    body.position.y = Math.min(Math.max(targetY, VIEW_MIN_Y), VIEW_MAX_Y);
    body.position.z = LOCKED_Z;
    body.velocity.z = 0;
  };

  const onMouseUp = () => {
    if (!draggingItemRef.current) return;
    const body = draggingItemRef.current.body;
    body.mass = 1;
    body.updateMassProperties();
    draggingItemRef.current = null;
  };

  useEffect(() => {
    const down = (e) => onMouseDown(e.clientX, e.clientY);
    const move = (e) => onMouseMove(e.clientX, e.clientY);
    const up = () => onMouseUp();

    window.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

    window.addEventListener(
      "touchstart",
      (e) => onMouseDown(e.touches[0].clientX, e.touches[0].clientY),
      { passive: false },
    );
    window.addEventListener(
      "touchmove",
      (e) => onMouseMove(e.touches[0].clientX, e.touches[0].clientY),
      { passive: false },
    );
    window.addEventListener("touchend", onMouseUp);

    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current || !scene || !cameraRef.current) return;
    const animate = () => {
      spawnedItems.current.forEach((item) => {
        // Clamp Y to ground and stop velocity if needed
        if (item.body.position.y < GROUND_Y) {
          item.body.position.y = GROUND_Y;
          item.body.velocity.y = 0;
        }

        updateViewportBounds();

        if (item.body.position.x < VIEW_MIN_X + 0.5) {
          item.body.position.x = VIEW_MIN_X + 0.5;
          item.body.velocity.x = 0;
        }
        if (item.body.position.x > VIEW_MAX_X - 0.5) {
          item.body.position.x = VIEW_MAX_X - 0.5;
          item.body.velocity.x = 0;
        }

        if (item.body.position.y < VIEW_MIN_Y) {
          item.body.position.y = VIEW_MIN_Y;
          item.body.velocity.y = 0;
        }
        if (item.body.position.y > VIEW_MAX_Y) {
          item.body.position.y = VIEW_MAX_Y;
          item.body.velocity.y = 0;
        }

        item.body.position.z = LOCKED_Z;
        item.body.velocity.z = 0;

        item.mesh.position.copy(item.body.position);
        item.mesh.quaternion.copy(item.body.quaternion);
      });
      rendererRef.current.render(scene, cameraRef.current);
      requestAnimationFrame(animate);
    };
    animate();
  }, [scene, spawnedItems]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      className=" px-5 py-1 hover:px-7 hover:py-3 z-10 transition-all duration-150 bg-white border-2 border-black rounded-[100px] flex items-center gap-3 font-host font-light text-[1.8rem]"
    >
      <img src={plus} alt="plus" />
      <span>add item</span>
    </button>
  );
}
