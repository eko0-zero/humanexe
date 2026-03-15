import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { World, Vec3, Body, Plane, Box } from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./index.css";
import Trash from "./component/trash.jsx";
import ButtonAddItem from "./component/ButtonAddItems.jsx";
import Skeleton from "./component/Skeleton.jsx";
import Interaction from "./component/Interaction.jsx";

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const MODEL_PATH = "./3D/models/character.glb";

const GROUND_Y = -1;
const MODEL_Y_OFFSET = -0.5;

// ── Eye flipbook ──
const EYE_FRAME_COUNT = 247;
const EYE_FPS = 25;
const EYE_FRAME_DURATION = 1 / EYE_FPS;
const EYE_START_FRAME = 149;
const EYE_END_FRAME = 246;

const getEyeTexturePath = (index) => {
  const padded = String(index + 1).padStart(3, "0");
  return `./3D/textures/eyes/eyes_${padded}.png`;
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

function loadModel(scene, placeholderCube) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_PATH,
      (gltf) => {
        scene.remove(placeholderCube);
        const model = gltf.scene;
        model.castShadow = true;

        // ── Détection du eye mesh par nom plutôt que par index ──
        const allMeshesInModel = [];
        model.traverse((n) => {
          if (n.isMesh) allMeshesInModel.push(n);
        });

        const eyeMesh =
          allMeshesInModel.find((m) => m.name.toLowerCase().includes("eye")) ??
          null;

        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = false;
            const isEyeMesh = eyeMesh !== null && eyeMesh === node;
            if (!isEyeMesh && node.material) {
              node.material = node.material.clone();
              node.material.shadowSide = THREE.FrontSide;
            }
          }
        });

        model.scale.set(1.4, 1.4, 1.4);
        scene.add(model);
        resolve({ model, animations: gltf.animations, eyeMesh });
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
function getMouseOnPlane(clientX, clientY, camera, renderer, planeOrigin) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  // Plan perpendiculaire a la direction camera, centre sur le personnage
  const normal = new THREE.Vector3();
  camera.getWorldDirection(normal);
  const origin = planeOrigin ?? new THREE.Vector3(0, 0, 0);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);

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
  const rawClipsRef = useRef([]);
  const isIntroRef = useRef(false);

  // Eye flipbook
  const eyeTexturesRef = useRef(new Array(EYE_FRAME_COUNT).fill(null));
  const eyeMaterialRef = useRef(null);
  const eyeFrameRef = useRef(EYE_START_FRAME);
  const eyeTimeAccRef = useRef(0);

  const meshRef = useRef(null);
  const characterBodyRef = useRef(null);

  // ── Refs drag exposés à la boucle animate ──
  const isDraggingRef = useRef(false);
  const mouseWorldRef = useRef(new THREE.Vector3());

  const [ready, setReady] = useState(false);
  const [model, setModel] = useState(null);

  useEffect(() => {
    console.log("useEffect INIT — canvas:", canvasRef.current);
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = createCamera(width / height);
    cameraRef.current = camera;
    const renderer = createRenderer(canvas, width, height);
    rendererRef.current = renderer;
    const { dirLight } = createLights(scene);
    createGround(scene);

    const world = createPhysicsWorld();
    worldRef.current = world;
    const groundBody = createGroundBody();
    world.addBody(groundBody);

    const characterBody = createCharacterBody(GROUND_Y + 2);
    world.addBody(characterBody);
    characterBodyRef.current = characterBody;

    const placeholder = createPlaceholderCube(scene);
    let mesh = placeholder;
    const modelSizeRef = { current: new THREE.Vector3(1, 1, 1) };

    mesh.position.set(
      characterBody.position.x,
      characterBody.position.y + MODEL_Y_OFFSET,
      characterBody.position.z,
    );

    loadModel(scene, placeholder).then(({ model, animations, eyeMesh }) => {
      // ── DEBUG ──
      const allMeshesDebug = [];
      model.traverse((n) => {
        if (n.isMesh) allMeshesDebug.push(n);
      });
      console.log(
        "MESHES:",
        allMeshesDebug.map((m, i) => `[${i}] ${m.name}`),
      );
      model.traverse((o) => {
        if (o.isSkinnedMesh && o.skeleton) {
          console.log(
            "SKELETON bones:",
            o.skeleton.bones.map((b) => b.name),
          );
        }
      });
      // ── FIN DEBUG ──

      mesh = model;
      meshRef.current = mesh;
      rawClipsRef.current = animations;

      const box = new THREE.Box3().setFromObject(mesh);
      box.getSize(modelSizeRef.current);

      mesh.position.set(
        characterBody.position.x,
        characterBody.position.y + MODEL_Y_OFFSET,
        characterBody.position.z,
      );

      // ── Mixer ──
      if (animations && animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
      }

      // ── Eye mesh : détecté par nom dans loadModel ──
      if (eyeMesh) {
        const eyeMat = new THREE.MeshBasicMaterial({
          transparent: true,
          alphaTest: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        eyeMesh.material = eyeMat;
        eyeMesh.visible = false;
        eyeMesh.renderOrder = 2;
        eyeMaterialRef.current = eyeMat;

        const texLoader = new THREE.TextureLoader();
        const loadNext = (i) => {
          if (i >= EYE_FRAME_COUNT) return;
          texLoader.load(
            getEyeTexturePath(i),
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.flipY = false;
              eyeTexturesRef.current[i] = tex;
              if (i === EYE_START_FRAME && eyeMaterialRef.current) {
                eyeMaterialRef.current.map = tex;
                eyeMaterialRef.current.needsUpdate = true;
                eyeMesh.visible = true;
              }
              setTimeout(() => loadNext(i + 1), 0);
            },
            undefined,
            () => setTimeout(() => loadNext(i + 1), 0),
          );
        };
        loadNext(0);
      } else {
        console.log(
          "[App] Pas de eye mesh trouvé dans ce GLB — flipbook désactivé.",
        );
      }

      setModel(model);
    });

    renderer.render(scene, camera);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const screenToNDC = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const isOverModel = (clientX, clientY) => {
      const m = meshRef.current;
      if (!m) return false;
      screenToNDC(clientX, clientY);
      raycaster.setFromCamera(mouse, camera);
      // Collecte tous les sous-meshes pour eviter les zones mortes
      const children = [];
      m.traverse((n) => {
        if (n.isMesh) children.push(n);
      });
      return raycaster.intersectObjects(children, false).length > 0;
    };

    const getViewBounds = () => {
      const distance = camera.position.z - (meshRef.current?.position.z ?? 0);
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const viewHeight = 2 * Math.tan(vFov / 2) * distance;
      const viewWidth = viewHeight * camera.aspect;
      return { halfW: viewWidth / 1.5, halfH: viewHeight / 1.5 };
    };

    const clampByModelEdges = (clampY = true) => {
      if (!meshRef.current) return;
      const { halfW, halfH } = getViewBounds();
      const halfModelW = modelSizeRef.current.x / 2;
      const modelHeight = modelSizeRef.current.y;

      characterBody.position.x = THREE.MathUtils.clamp(
        characterBody.position.x,
        -halfW + halfModelW,
        halfW - halfModelW,
      );

      if (clampY) {
        const maxY = halfH - modelHeight / 2;
        if (characterBody.position.y > maxY) characterBody.position.y = maxY;
      }
    };

    const dragOffset = new THREE.Vector3();

    const getClientPos = (e) => {
      if (e.touches && e.touches.length > 0)
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      return { clientX: e.clientX, clientY: e.clientY };
    };

    const onMouseDown = (e) => {
      const { clientX, clientY } = getClientPos(e);

      // DEBUG
      screenToNDC(clientX, clientY);
      raycaster.setFromCamera(mouse, camera);
      const dbgChildren = [];
      if (meshRef.current)
        meshRef.current.traverse((n) => {
          if (n.isMesh) dbgChildren.push(n);
        });
      const dbgHits = raycaster.intersectObjects(dbgChildren, false);
      console.log("CLICK children count:", dbgChildren.length);
      console.log(
        "CLICK hits:",
        dbgHits.length,
        dbgHits.map((h) => h.object.name),
      );
      console.log("CLICK isOverModel:", isOverModel(clientX, clientY));
      // FIN DEBUG

      if (!isOverModel(clientX, clientY)) return;
      console.log("PASSED isOverModel — drag start");

      isDraggingRef.current = true;

      const planeOrigin = new THREE.Vector3(
        characterBody.position.x,
        characterBody.position.y,
        characterBody.position.z,
      );
      const mouseWorld = getMouseOnPlane(
        clientX,
        clientY,
        camera,
        renderer,
        planeOrigin,
      );
      if (mouseWorld) {
        mouseWorldRef.current.copy(mouseWorld);
        dragOffset.set(
          characterBody.position.x - mouseWorld.x,
          characterBody.position.y - mouseWorld.y,
          0,
        );
      }

      characterBody.mass = 0;
      characterBody.updateMassProperties();
      characterBody.velocity.set(0, 0, 0);
      characterBody.angularVelocity.set(0, 0, 0);
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const { clientX, clientY } = getClientPos(e);

      const planeOrigin = new THREE.Vector3(
        characterBody.position.x,
        characterBody.position.y,
        characterBody.position.z,
      );
      const mouseWorld = getMouseOnPlane(
        clientX,
        clientY,
        camera,
        renderer,
        planeOrigin,
      );
      if (!mouseWorld) return;

      console.log(
        "mouseWorld.y:",
        mouseWorld.y.toFixed(3),
        "dragOffset.y:",
        dragOffset.y.toFixed(3),
        "=> body.y:",
        (mouseWorld.y + dragOffset.y).toFixed(3),
      );

      mouseWorldRef.current.copy(mouseWorld);

      characterBody.position.x = mouseWorld.x + dragOffset.x;
      characterBody.position.y = mouseWorld.y + dragOffset.y;

      const minY = GROUND_Y + 0.5;
      if (characterBody.position.y < minY) characterBody.position.y = minY;
      clampByModelEdges(false); // pas de clamp Y pendant le drag
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      characterBody.mass = 1;
      characterBody.updateMassProperties();
    };

    const onDragOver = (e) => e.preventDefault();
    const onDrop = (e) => {
      e.preventDefault();
      if (!mesh) return;
      screenToNDC(e.clientX, e.clientY);
      raycaster.setFromCamera(mouse, camera);
      raycaster.intersectObjects([mesh], true);
    };

    const updateLightTarget = () => {
      const m = meshRef.current;
      if (!m) return;
      dirLight.target.position.copy(m.position);
      dirLight.target.updateMatrixWorld();
    };

    let animId;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      world.step(1 / 60, dt, 3);
      mixerRef.current?.update(dt);

      // Eye flipbook
      const eyeMat = eyeMaterialRef.current;
      if (eyeMat) {
        eyeTimeAccRef.current += dt;
        if (eyeTimeAccRef.current >= EYE_FRAME_DURATION) {
          eyeTimeAccRef.current -= EYE_FRAME_DURATION;

          let next = eyeFrameRef.current + 1;
          if (next > EYE_END_FRAME) next = EYE_START_FRAME;

          let tries = 0;
          while (
            eyeTexturesRef.current[next] === null &&
            tries < EYE_END_FRAME - EYE_START_FRAME + 1
          ) {
            next++;
            if (next > EYE_END_FRAME) next = EYE_START_FRAME;
            tries++;
          }

          const tex = eyeTexturesRef.current[next];
          if (tex) {
            eyeFrameRef.current = next;
            eyeMat.map = tex;
            eyeMat.needsUpdate = true;
          }
        }
      }

      // ── updateBones avec isDragging + mouseWorld ──
      skeletonRef.current?.updateBones(
        isDraggingRef.current,
        mouseWorldRef.current,
      );

      clampByModelEdges();

      const minY = GROUND_Y + 0.5;
      if (characterBody.position.y < minY) {
        characterBody.position.y = minY;
        characterBody.velocity.y = 0;
      }

      const activeMesh = meshRef.current;
      if (activeMesh) {
        activeMesh.position.set(
          characterBody.position.x,
          characterBody.position.y + MODEL_Y_OFFSET,
          characterBody.position.z,
        );
      }

      // DEBUG position
      if (meshRef.current) {
        console.log(
          "mesh.y:",
          meshRef.current.position.y.toFixed(3),
          "| body.y:",
          characterBody.position.y.toFixed(3),
        );
      }

      updateLightTarget();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchstart", onMouseDown, { passive: false });
    window.addEventListener("touchmove", onMouseMove, { passive: false });
    window.addEventListener("touchend", onMouseUp);
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("dragover", onDragOver);
    renderer.domElement.addEventListener("drop", onDrop);

    setReady(true);
    return () => {
      cancelAnimationFrame(animId);
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      eyeTexturesRef.current.forEach((t) => t?.dispose());
      eyeTexturesRef.current = new Array(EYE_FRAME_COUNT).fill(null);
      eyeMaterialRef.current = null;
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
        />
      )}
      {model && (
        <Interaction
          mixerRef={mixerRef}
          rawClips={rawClipsRef.current}
          spawnedItems={spawnedItemsRef}
          characterBody={characterBodyRef}
          isIntroRef={isIntroRef}
          skeletonRef={skeletonRef}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{ display: "block", position: "absolute", top: 0, left: 0 }}
      ></canvas>
    </main>
  );
};

export default App;
