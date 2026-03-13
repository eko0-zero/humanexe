import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { World, Vec3, Body, Plane, Box } from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./index.css";
import Trash from "./component/trash.jsx";
import ButtonAddItem from "./component/ButtonAddItems.jsx";
import Skeleton from "./component/Skeleton.jsx";

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const MODEL_PATH = "./3D/models/character.glb";

const GROUND_Y = -1;
const MODEL_Y_OFFSET = -0.5;

// ── Eye flipbook ──
const EYE_FRAME_COUNT = 247;
const EYE_FPS = 25;
const EYE_FRAME_DURATION = 1 / EYE_FPS; // secondes par frame

// Génère le chemin : eye_001.png, eye_002.png... (padding 3 chiffres)
// Si tes fichiers sont eye_1.png, eye_2.png, change padStart(3, "0") en just String(i + 1)
const getEyeTexturePath = (index) => {
  const padded = String(index + 1).padStart(3, "0");
  return `./3D/textures/eyes/eyes-v1_${padded}.png`;
};

// ─────────────────────────────────────────────
// HELPERS — scène Three.js
// ─────────────────────────────────────────────
function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(30, aspect);
  camera.position.set(0, 3.1, 4.9);
  camera.rotation.x = -0.49;
  return camera;
}

function createRenderer(canvas, width, height) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0xffffff);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
}

function createLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 5);
  dirLight.position.set(0, 8, 5);
  dirLight.target.position.set(0, 0, 0);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(6048, 6048);
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 100;
  scene.add(dirLight);
  scene.add(dirLight.target);

  return { ambient, dirLight };
}

function createGround(scene) {
  const geometry = new THREE.PlaneGeometry(10, 10);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = GROUND_Y;
  plane.receiveShadow = true;
  scene.add(plane);
  return plane;
}

function createPlaceholderCube(scene) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  scene.add(cube);
  return cube;
}

// Retourne { model, animations }
function loadModel(scene, placeholderCube) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_PATH,
      (gltf) => {
        scene.remove(placeholderCube);
        const model = gltf.scene;
        model.castShadow = true;

        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = false;
            if (node.material) {
              node.material = node.material.clone();
              node.material.shadowSide = THREE.FrontSide;
            }
          }
        });

        model.scale.set(1.4, 1.4, 1.4);
        scene.add(model);
        resolve({ model, animations: gltf.animations });
      },
      undefined,
      (error) => {
        console.error("Erreur chargement modèle :", error);
        reject(error);
      },
    );
  });
}

// ─────────────────────────────────────────────
// HELPER — précharge toutes les textures des yeux
// ─────────────────────────────────────────────
function preloadEyeTextures() {
  const loader = new THREE.TextureLoader();
  const textures = [];

  for (let i = 0; i < EYE_FRAME_COUNT; i++) {
    const path = getEyeTexturePath(i);
    const tex = loader.load(path, undefined, undefined, () =>
      console.warn(`Texture introuvable : ${path}`),
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // GLB utilise des UVs non-flippées
    textures.push(tex);
  }

  console.log(`${EYE_FRAME_COUNT} textures yeux préchargées à ${EYE_FPS} fps`);
  return textures;
}

// ─────────────────────────────────────────────
// HELPER — trouve les meshes des yeux dans le modèle
// ─────────────────────────────────────────────
function findEyeMeshes(model) {
  const eyeMeshes = [];
  model.traverse((node) => {
    if (node.isMesh) {
      const name = node.name.toLowerCase();
      if (
        name.includes("eye") ||
        name.includes("yeux") ||
        name.includes("oeil") ||
        name.includes("iris") ||
        name.includes("pupil")
      ) {
        eyeMeshes.push(node);
        console.log(`Mesh yeux trouvé : "${node.name}"`);
      }
    }
  });

  if (eyeMeshes.length === 0) {
    console.warn("Aucun mesh yeux trouvé. Noms de meshes disponibles :");
    model.traverse((node) => {
      if (node.isMesh) console.log(" →", node.name);
    });
  }

  return eyeMeshes;
}

// ─────────────────────────────────────────────
// HELPERS — monde physique Cannon.js
// ─────────────────────────────────────────────
function createPhysicsWorld() {
  const world = new World({ gravity: new Vec3(0, -9.82, 0) });
  world.solver.iterations = 10;
  return world;
}

function createGroundBody() {
  const shape = new Plane();
  const body = new Body({ mass: 0 });
  body.addShape(shape);
  body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  body.position.set(0, GROUND_Y, 0);
  return body;
}

function createCharacterBody(startY) {
  const halfExtents = new Vec3(0.4, 0.5, 0.3);
  const shape = new Box(halfExtents);
  const body = new Body({ mass: 1, linearDamping: 0.9 });
  body.addShape(shape);
  body.position.set(0, startY, 0);
  return body;
}

// ─────────────────────────────────────────────
// HELPER — projection souris → point 3D
// ─────────────────────────────────────────────
function getMouseOnPlane(clientX, clientY, camera, renderer, planePoint) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const normal = new THREE.Vector3();
  camera.getWorldDirection(normal);
  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(normal, planePoint);

  const target = new THREE.Vector3();
  ray.ray.intersectPlane(plane, target);

  return target;
}

// ─────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────
const App = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const worldRef = useRef(null);
  const spawnedItemsRef = useRef([]);
  const skeletonRef = useRef(null);
  const mixerRef = useRef(null);

  // Eye flipbook
  const eyeTexturesRef = useRef([]);
  const eyeMeshesRef = useRef([]);
  const eyeFrameRef = useRef(0); // index de la frame courante
  const eyeTimeAccRef = useRef(0); // accumulateur de temps (secondes)

  // Bone refs
  const headBoneRef = useRef(null);
  const leftArmBoneRef = useRef(null);
  const rightArmBoneRef = useRef(null);
  const leftArmBoneTopRef = useRef(null);
  const rightArmBoneTopRef = useRef(null);

  const meshRef = useRef(null);
  const characterBodyRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [model, setModel] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // ── Scène ──
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = createCamera(width / height);
    cameraRef.current = camera;
    const renderer = createRenderer(canvas, width, height);
    rendererRef.current = renderer;
    const { dirLight } = createLights(scene);
    createGround(scene);

    // ── Physique ──
    const world = createPhysicsWorld();
    worldRef.current = world;
    const groundBody = createGroundBody();
    world.addBody(groundBody);

    const characterBody = createCharacterBody(GROUND_Y + 2);
    world.addBody(characterBody);
    characterBodyRef.current = characterBody;

    // ── Précharge les textures des yeux ──
    eyeTexturesRef.current = preloadEyeTextures();

    // ── Modèle ──
    const placeholder = createPlaceholderCube(scene);
    let mesh = placeholder;
    let modelSize = new THREE.Vector3(1, 1, 1);

    mesh.position.set(
      characterBody.position.x,
      characterBody.position.y + MODEL_Y_OFFSET,
      characterBody.position.z,
    );

    loadModel(scene, placeholder).then(({ model, animations }) => {
      mesh = model;
      meshRef.current = mesh;

      const box = new THREE.Box3().setFromObject(mesh);
      box.getSize(modelSize);

      mesh.position.set(
        characterBody.position.x,
        characterBody.position.y + MODEL_Y_OFFSET,
        characterBody.position.z,
      );

      // ── Bones ──
      const skeleton = model.getObjectByProperty(
        "type",
        "SkinnedMesh",
      )?.skeleton;
      if (skeleton) {
        headBoneRef.current =
          skeleton.getBoneByName("head") || skeleton.getBoneByName("Head");
        leftArmBoneRef.current = skeleton.getBoneByName("leftArm");
        rightArmBoneRef.current = skeleton.getBoneByName("rightArm");
        leftArmBoneTopRef.current = skeleton.getBoneByName("leftArmTop");
        rightArmBoneTopRef.current = skeleton.getBoneByName("rightArmTop");
      }

      // ── Animations GLB en boucle ──
      if (animations && animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
        animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        });
        console.log(
          `${animations.length} animation(s) lancée(s) :`,
          animations.map((a) => a.name),
        );
      }

      // ── Trouver les meshes des yeux ──
      const eyeMeshes = findEyeMeshes(model);
      eyeMeshesRef.current = eyeMeshes;

      // Appliquer la première frame immédiatement
      if (eyeMeshes.length > 0 && eyeTexturesRef.current.length > 0) {
        eyeMeshes.forEach((eyeMesh) => {
          eyeMesh.material.map = eyeTexturesRef.current[0];
          eyeMesh.material.transparent = true;
          eyeMesh.material.needsUpdate = true;
        });
      }

      setModel(model);
    });

    renderer.render(scene, camera);

    // ─────────────────────────────────────────
    // RAYCASTER
    // ─────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const screenToNDC = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const isOverModel = (clientX, clientY) => {
      if (!mesh) return false;
      screenToNDC(clientX, clientY);
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects([mesh], true).length > 0;
    };

    // ─────────────────────────────────────────
    // CLAMP — bords de l'écran
    // ─────────────────────────────────────────
    const getViewBounds = () => {
      const distance = camera.position.z - mesh.position.z;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const viewHeight = 2 * Math.tan(vFov / 2) * distance;
      const viewWidth = viewHeight * camera.aspect;
      return { halfW: viewWidth / 1.5, halfH: viewHeight / 1.5 };
    };

    const clampByModelEdges = () => {
      if (!mesh) return;
      const { halfW, halfH } = getViewBounds();
      const halfModelW = modelSize.x / 2;
      const modelHeight = modelSize.y;

      characterBody.position.x = THREE.MathUtils.clamp(
        characterBody.position.x,
        -halfW + halfModelW,
        halfW - halfModelW,
      );

      const maxY = halfH - modelHeight / 2;
      if (characterBody.position.y > maxY) characterBody.position.y = maxY;
    };

    // ─────────────────────────────────────────
    // DRAG
    // ─────────────────────────────────────────
    let isDragging = false;
    const dragOffset = new THREE.Vector3();
    const dragPlanePoint = new THREE.Vector3();

    const getClientPos = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    };

    const onMouseDown = (e) => {
      const { clientX, clientY } = getClientPos(e);
      if (!isOverModel(clientX, clientY)) return;

      isDragging = true;
      dragPlanePoint.set(
        characterBody.position.x,
        characterBody.position.y,
        characterBody.position.z,
      );

      const mouseWorld = getMouseOnPlane(
        clientX,
        clientY,
        camera,
        renderer,
        dragPlanePoint,
      );
      dragOffset.set(
        characterBody.position.x - mouseWorld.x,
        characterBody.position.y - mouseWorld.y,
        0,
      );

      characterBody.mass = 0;
      characterBody.updateMassProperties();
      characterBody.velocity.set(0, 0, 0);
      characterBody.angularVelocity.set(0, 0, 0);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const { clientX, clientY } = getClientPos(e);

      const mouseWorld = getMouseOnPlane(
        clientX,
        clientY,
        camera,
        renderer,
        dragPlanePoint,
      );
      characterBody.position.x = mouseWorld.x + dragOffset.x;
      characterBody.position.y = mouseWorld.y + dragOffset.y;

      const minY = GROUND_Y + 0.5;
      if (characterBody.position.y < minY) characterBody.position.y = minY;

      clampByModelEdges();
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      characterBody.mass = 1;
      characterBody.updateMassProperties();
    };

    // ─────────────────────────────────────────
    // DROP DE FICHIER
    // ─────────────────────────────────────────
    const onDragOver = (e) => e.preventDefault();
    const onDrop = (e) => {
      e.preventDefault();
      if (!mesh) return;
      screenToNDC(e.clientX, e.clientY);
      raycaster.setFromCamera(mouse, camera);
      raycaster.intersectObjects([mesh], true);
    };

    // ─────────────────────────────────────────
    // LUMIÈRE suit le modèle
    // ─────────────────────────────────────────
    const updateLightTarget = () => {
      if (!mesh) return;
      dirLight.target.position.copy(mesh.position);
      dirLight.target.updateMatrixWorld();
    };

    // ─────────────────────────────────────────
    // BOUCLE D'ANIMATION
    // ─────────────────────────────────────────
    let animId;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      world.step(1 / 60, dt, 3);

      // Mise à jour du mixer (animations squelettiques GLB)
      mixerRef.current?.update(dt);

      // ── Flipbook yeux — avance d'une frame tous les 1/25s ──
      const eyeTextures = eyeTexturesRef.current;
      const eyeMeshes = eyeMeshesRef.current;

      if (eyeTextures.length > 0 && eyeMeshes.length > 0) {
        eyeTimeAccRef.current += dt;

        if (eyeTimeAccRef.current >= EYE_FRAME_DURATION) {
          // On soustrait la durée plutôt que de reset à 0
          // pour conserver le surplus et éviter la dérive temporelle
          eyeTimeAccRef.current -= EYE_FRAME_DURATION;

          eyeFrameRef.current = (eyeFrameRef.current + 1) % EYE_FRAME_COUNT;
          const nextTex = eyeTextures[eyeFrameRef.current];

          eyeMeshes.forEach((eyeMesh) => {
            eyeMesh.material.map = nextTex;
            eyeMesh.material.needsUpdate = true;
          });
        }
      }

      skeletonRef.current?.updateBones();
      clampByModelEdges();

      const minY = GROUND_Y + 0.5;
      if (characterBody.position.y < minY) {
        characterBody.position.y = minY;
        characterBody.velocity.y = 0;
      }

      if (mesh) {
        mesh.position.set(
          characterBody.position.x,
          characterBody.position.y + MODEL_Y_OFFSET,
          characterBody.position.z,
        );
      }

      updateLightTarget();
      renderer.render(scene, camera);
    };
    animate();

    // ─────────────────────────────────────────
    // RESIZE
    // ─────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // ─────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchstart", onMouseDown, { passive: false });
    window.addEventListener("touchmove", onMouseMove, { passive: false });
    window.addEventListener("touchend", onMouseUp);
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("dragover", onDragOver);
    renderer.domElement.addEventListener("drop", onDrop);

    // ─────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────
    setReady(true);
    return () => {
      cancelAnimationFrame(animId);
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      eyeTexturesRef.current.forEach((t) => t.dispose());
      eyeTexturesRef.current = [];
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchstart", onMouseDown);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("dragover", onDragOver);
      renderer.domElement.removeEventListener("drop", onDrop);
      renderer.dispose();
    };
  }, []);

  return (
    <main className="relative w-full h-screen">
      <p className="absolute bottom-5 left-5 font-host italic font-light text-[1.1rem] text-grey z-10">
        Click on "space" or "esc" to open the menu.
      </p>
      <ButtonAddItem
        scene={sceneRef.current}
        world={worldRef.current}
        camera={cameraRef.current}
        renderer={rendererRef.current}
        spawnedItems={spawnedItemsRef}
        characterBody={characterBodyRef.current}
        getViewBounds={() => {
          const camera = cameraRef.current;
          const mesh = meshRef.current;
          if (!camera || !mesh) return { halfW: 5, halfH: 5 };
          const distance = camera.position.z - mesh.position.z;
          const vFov = THREE.MathUtils.degToRad(camera.fov);
          const viewHeight = 2 * Math.tan(vFov / 2) * distance;
          const viewWidth = viewHeight * camera.aspect;
          return { halfW: viewWidth / 2, halfH: viewHeight / 2 };
        }}
      />
      {ready && (
        <Trash
          scene={sceneRef.current}
          camera={cameraRef.current}
          spawnedItems={spawnedItemsRef}
          world={worldRef.current}
          renderer={rendererRef.current}
        />
      )}
      {model && (
        <Skeleton
          ref={skeletonRef}
          model={model}
          world={worldRef.current}
          characterBody={characterBodyRef.current}
          headBone={headBoneRef.current}
          leftArmBone={leftArmBoneRef.current}
          rightArmBone={rightArmBoneRef.current}
          leftArmBoneTop={leftArmBoneTopRef.current}
          rightArmBoneTop={rightArmBoneTopRef.current}
        />
      )}
      <canvas ref={canvasRef}></canvas>
    </main>
  );
};

export default App;
