import { useRef, useCallback, useState, useEffect } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { Body, Box, Vec3, Material, ContactMaterial, World } from "cannon-es";
import plus from "../assets/img/svg/plus.svg";

// Matériau physique partagé par tous les items (friction / rebond)
const ITEM_MATERIAL = new Material("itemMaterial");
const GROUND_Y = -1;

// Liste des modèles d'item avec stats
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
    path: "/3D/models/knife.glb",
    stats: { health: -25, weight: 3, speed: 1, rarity: 1 },
  },
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

// Crée et ajoute un item à la scène et au monde Cannon
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
        const boxMin = box.min;
        const boxMax = box.max;
        const centerY = (boxMin.y + boxMax.y) / 2;
        const itemGroundOffset = centerY - boxMin.y;
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
          restitution: 0.25,
          collisionResponse: true,
        });
        body.addShape(shape);
        body.collisionFilterGroup = 1;
        body.collisionFilterMask = 1;
        body.position.set(
          position.x,
          position.y - itemGroundOffset,
          position.z,
        );
        world.addBody(body);
        const itemData = {
          mesh: model,
          body,
          size,
          groundOffset: itemGroundOffset,
          springStiffness: 1000,
          springDamping: 100,
          isBeingDragged: false,
          desiredX: body.position.x,
          desiredY: body.position.y,
          useSpring: false,
          items: true,
          modelName: modelConfig.name,
          stats: modelConfig.stats,
        };
        resolve(itemData);
      },
      undefined,
      (error) => {
        console.error("[SPAWN] Erreur:", error);
        reject(new Error(`Impossible de charger le modèle`));
      },
    );
  });
}

export default function ButtonAddItem(props) {
  // Provide default refs for scene/world/spawnedItems if not provided as props
  const internalSceneRef = useRef();
  const internalWorldRef = useRef();
  const internalSpawnedItemsRef = useRef([]);
  const [internalRenderer, setInternalRenderer] = useState(null);
  const [internalCamera, setInternalCamera] = useState(null);

  // If not provided, create a basic THREE scene/world/camera/renderer for demo
  useEffect(() => {
    if (!props.scene && !internalSceneRef.current) {
      internalSceneRef.current = new THREE.Scene();
    }
    if (!props.world && !internalWorldRef.current) {
      internalWorldRef.current = new World();
      internalWorldRef.current.gravity.set(0, -9.82, 0);
    }
    if (!props.camera && !internalCamera) {
      // PerspectiveCamera(fov, aspect, near, far)
      const cam = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );
      cam.position.set(0, 0, 8);
      setInternalCamera(cam);
    }
    if (!props.renderer && !internalRenderer) {
      const rend = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      rend.setSize(window.innerWidth, window.innerHeight);
      rend.setClearColor(0xffffff, 0);
      rend.domElement.style.position = "fixed";
      rend.domElement.style.top = 0;
      rend.domElement.style.left = 0;
      rend.domElement.style.zIndex = 0;
      document.body.appendChild(rend.domElement);
      setInternalRenderer(rend);
      // Clean up
      return () => {
        document.body.removeChild(rend.domElement);
      };
    }
  }, []);

  // Use provided props or fallback to internal refs
  const scene = props.scene || internalSceneRef.current;
  const world = props.world || internalWorldRef.current;
  const spawnedItems = props.spawnedItems || internalSpawnedItemsRef;
  const camera = props.camera || internalCamera;
  const renderer = props.renderer || internalRenderer;
  const modelSize = props.modelSize;
  const characterBody = props.characterBody;
  const getViewBounds =
    props.getViewBounds ||
    (() => {
      // Fallback: simple bounds based on camera
      if (!camera) return { halfW: 4, halfH: 3 };
      // Estimate width/height at z=0 plane
      const vFOV = (camera.fov * Math.PI) / 180;
      const halfH = Math.tan(vFOV / 2) * Math.abs(camera.position.z);
      const halfW = halfH * camera.aspect;
      return { halfW, halfH };
    });

  const isLoadingRef = useRef(false);
  const [itemCount, setItemCount] = useState(0);
  const [error, setError] = useState(null);
  const draggedItemRef = useRef(null);
  const dragOffsetRef = useRef(new THREE.Vector3());
  const dragPlanePointRef = useRef(new THREE.Vector3());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const lastMousePosRef = useRef(new THREE.Vector3());
  const mouseVelocityRef = useRef(new THREE.Vector3());

  const screenToNDC = useCallback(
    (clientX, clientY) => {
      if (!renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    },
    [renderer],
  );

  const getMouseOnPlane = useCallback(
    (clientX, clientY, planePoint) => {
      screenToNDC(clientX, clientY);
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      const plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(normal, planePoint);
      const target = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, target);
      return target;
    },
    [camera, screenToNDC],
  );

  const getItemUnderMouse = useCallback(
    (clientX, clientY) => {
      if (!spawnedItems.current.length) return null;
      screenToNDC(clientX, clientY);
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const meshes = spawnedItems.current.map((item) => item.mesh);
      const intersects = raycasterRef.current.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        return spawnedItems.current.find((item) => {
          let node = hitMesh;
          while (node) {
            if (node === item.mesh) return true;
            node = node.parent;
          }
          return false;
        });
      }
      return null;
    },
    [spawnedItems, camera, screenToNDC],
  );

  const clampItemWithinBounds = useCallback(
    (item) => {
      const bounds = getViewBounds();
      if (!bounds) return;
      const { halfW, halfH } = bounds;
      const halfItemW = item.size.x / 2;
      const bodyHalfHeight = item.size.y / 2;
      const minX = -halfW + halfItemW * 0.5;
      const maxX = halfW - halfItemW * 0.5;
      const minY = GROUND_Y + bodyHalfHeight;
      const maxY = halfH - item.size.y / 4;
      if (item.body.position.x < minX) {
        item.body.position.x = minX;
        item.body.velocity.x *= -0.4;
      } else if (item.body.position.x > maxX) {
        item.body.position.x = maxX;
        item.body.velocity.x *= -0.4;
      }
      if (item.body.position.y < minY) {
        item.body.position.y = minY;
        item.body.velocity.y *= -0.4;
      } else if (item.body.position.y > maxY) {
        item.body.position.y = maxY;
        item.body.velocity.y *= -0.4;
      }
      item.body.position.z = 0;
      item.body.velocity.z = 0;
    },
    [getViewBounds, characterBody, spawnedItems],
  );

  const onMouseDown = useCallback(
    (e) => {
      const { clientX, clientY } = e.touches
        ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
        : { clientX: e.clientX, clientY: e.clientY };
      const item = getItemUnderMouse(clientX, clientY);
      if (!item) return;
      draggedItemRef.current = item;
      item.isBeingDragged = true;
      item.body.type = Body.KINEMATIC;
      item.body.updateMassProperties();
      dragPlanePointRef.current.copy(item.body.position);
      const mouseWorld = getMouseOnPlane(
        clientX,
        clientY,
        dragPlanePointRef.current,
      );
      dragOffsetRef.current.set(
        item.body.position.x - mouseWorld.x,
        item.body.position.y - mouseWorld.y,
        0,
      );
      item.body.velocity.set(0, 0, 0);
      item.body.angularVelocity.set(0, 0, 0);
    },
    [getItemUnderMouse, getMouseOnPlane],
  );

  const onMouseMove = useCallback(
    (e) => {
      if (!draggedItemRef.current) return;
      const { clientX, clientY } = e.touches
        ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
        : { clientX: e.clientX, clientY: e.clientY };
      const item = draggedItemRef.current;
      dragPlanePointRef.current.copy(item.body.position);
      const mouseWorld = getMouseOnPlane(
        clientX,
        clientY,
        dragPlanePointRef.current,
      );
      let desiredX = mouseWorld.x + dragOffsetRef.current.x;
      let desiredY = mouseWorld.y + dragOffsetRef.current.y;
      const bounds = getViewBounds();
      if (bounds) {
        const { halfW, halfH } = bounds;
        const halfItemW = item.size.x / 2;
        const itemHeight = item.size.y;
        desiredX = THREE.MathUtils.clamp(
          desiredX,
          -halfW + halfItemW * 0.5,
          halfW - halfItemW * 0.5,
        );
        desiredY = THREE.MathUtils.clamp(
          desiredY,
          -halfH + itemHeight / 2,
          halfH - itemHeight / 4,
        );
        if (characterBody) {
          const distX = desiredX - characterBody.position.x;
          const distY = desiredY - characterBody.position.y;
          const distance = Math.sqrt(distX * distX + distY * distY);
          const minDistance = 1.0;
          if (distance < minDistance && distance > 0.01) {
            const angle = Math.atan2(distY, distX);
            desiredX = characterBody.position.x + Math.cos(angle) * minDistance;
            desiredY = characterBody.position.y + Math.sin(angle) * minDistance;
          }
        }
        const currentMousePos = new THREE.Vector3(desiredX, desiredY, 0);
        mouseVelocityRef.current.subVectors(
          currentMousePos,
          lastMousePosRef.current,
        );
        lastMousePosRef.current.copy(currentMousePos);
        item.body.position.x = desiredX;
        item.body.position.y = desiredY;
        item.body.position.z = 0;
        item.body.velocity.set(0, 0, 0);
      }
    },
    [getMouseOnPlane, getViewBounds, characterBody, spawnedItems],
  );

  const onMouseUp = useCallback(() => {
    if (draggedItemRef.current) {
      const item = draggedItemRef.current;
      item.body.type = Body.DYNAMIC;
      item.body.updateMassProperties();
      const velocity = mouseVelocityRef.current.length();
      const minThrowSpeed = 0.015;
      if (velocity > minThrowSpeed) {
        const strength = THREE.MathUtils.clamp(velocity * 14, 1.2, 6);
        item.body.applyImpulse(
          new Vec3(
            mouseVelocityRef.current.x * strength,
            mouseVelocityRef.current.y * strength,
            0,
          ),
          item.body.position,
        );
        item.body.velocity.scale(1, item.body.velocity);
      }
      item.body.angularVelocity.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        0,
      );
      mouseVelocityRef.current.set(0, 0, 0);
      item.isBeingDragged = false;
      item.desiredX = item.body.position.x;
      item.desiredY = item.body.position.y;
    }
    draggedItemRef.current = null;
  }, []);

  useEffect(() => {
    if (!renderer) return;
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchstart", onMouseDown, { passive: false });
    window.addEventListener("touchmove", onMouseMove, { passive: false });
    window.addEventListener("touchend", onMouseUp);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchstart", onMouseDown);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [onMouseDown, onMouseMove, onMouseUp, renderer]);

  useEffect(() => {
    window.clampSpawnedItemsWithinBounds = () => {
      spawnedItems.current.forEach((item) => {
        clampItemWithinBounds(item);
      });
    };
    return () => {
      delete window.clampSpawnedItemsWithinBounds;
    };
  }, [spawnedItems, clampItemWithinBounds]);

  // Animation loop for demo if using internal scene/camera/renderer
  useEffect(() => {
    if (props.scene || !scene || !renderer || !camera) return;
    let frame;
    function animate() {
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(animate);
    }
    animate();
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scene, renderer, camera, props.scene]);

  // Handler pour ajouter un nouvel item
  const handleClick = useCallback(async () => {
    if (!scene || !world || !spawnedItems) {
      setError("❌ Scene/World/Items non disponible");
      return;
    }
    if (isLoadingRef.current) return;
    try {
      isLoadingRef.current = true;
      setError(null);
      const bounds = getViewBounds ? getViewBounds() : null;
      if (!bounds) {
        setError("❌ Impossible de déterminer les limites de la vue.");
        return;
      }
      const spawnX = 0;
      const spawnY = 0;
      const spawnZ = 0;
      const randomIndex = Math.floor(Math.random() * ITEM_MODELS.length);
      const modelConfig = ITEM_MODELS[randomIndex];
      const item = await createSpawnedItem(
        scene,
        world,
        new THREE.Vector3(spawnX, spawnY, spawnZ),
        modelConfig,
      );
      spawnedItems.current.push(item);
      setItemCount(spawnedItems.current.length);
    } catch (err) {
      setError(`Erreur: ${err.message}`);
    } finally {
      isLoadingRef.current = false;
    }
  }, [scene, world, spawnedItems, getViewBounds]);

  const isDisabled = isLoadingRef.current || !scene || !world;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ pointerEvents: "auto" }}
      className="absolute top-[15vh] left-5 hover:px-6 hover:py-3 z-10 font-host font-light text-[1.8rem] border-2 border-black rounded-[100px] px-5 py-2 flex items-center gap-3 transition-all bg-white"
      disabled={isDisabled}
    >
      <img src={plus} alt="plus" />
      <span>add item</span>
    </button>
  );
}
