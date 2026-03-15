import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const ANIM_FPS = 25;
const COLLISION_DISTANCE = 1.2;

const PHASE_LOOP = "loop";
const PHASE_INTRO = "intro";

// ─────────────────────────────────────────────
// COMPOSANT
// Props depuis App.jsx :
//   mixerRef      — ref vers THREE.AnimationMixer du character
//   rawClips      — tableau des clips GLB originaux (gltf.animations)
//   spawnedItems  — ref vers le tableau { mesh, body }[] des items
//   characterBody — ref vers le Body cannon-es du character
// ─────────────────────────────────────────────
const Interaction = ({ mixerRef, rawClips, spawnedItems, characterBody }) => {
  const phaseRef = useRef(PHASE_LOOP);
  const introActionsRef = useRef(null);
  const loopActionsRef = useRef(null);
  const initializedRef = useRef(false);

  // ── Initialise les actions dès que mixer + rawClips sont dispos ──
  useEffect(() => {
    let rafId;

    const tryInit = () => {
      const mixer = mixerRef?.current;
      if (!mixer || !rawClips || rawClips.length === 0) {
        rafId = requestAnimationFrame(tryInit);
        return;
      }

      // Actions boucle (150→300) — celles déjà actives lancées par App.jsx
      const currentActions = [...mixer._actions];
      loopActionsRef.current = currentActions;

      // Actions intro (0→150) — créées depuis les clips ORIGINAUX du GLB
      const introActions = rawClips.map((clip) => {
        const introClip = THREE.AnimationUtils.subclip(
          clip,
          `${clip.name}_intro`,
          0,
          150,
          ANIM_FPS,
        );
        const action = mixer.clipAction(introClip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        return action;
      });

      introActionsRef.current = introActions;
      initializedRef.current = true;
    };

    rafId = requestAnimationFrame(tryInit);
    return () => cancelAnimationFrame(rafId);
  }, [mixerRef, rawClips]);

  // ── Fin de l'intro → bascule sur la boucle 150→300 ──
  useEffect(() => {
    let mixer = mixerRef?.current;

    const onFinished = (e) => {
      if (phaseRef.current !== PHASE_INTRO) return;

      const introActions = introActionsRef.current;
      const loopActions = loopActionsRef.current;
      if (!introActions || !loopActions) return;

      if (!introActions.some((a) => a === e.action)) return;

      introActions.forEach((a) => a.stop());
      loopActions.forEach((a) => {
        a.reset();
        a.play();
      });
      phaseRef.current = PHASE_LOOP;
    };

    // Le mixer peut ne pas être disponible immédiatement
    const attach = () => {
      mixer = mixerRef?.current;
      if (!mixer) {
        setTimeout(attach, 100);
        return;
      }
      mixer.addEventListener("finished", onFinished);
    };
    attach();

    return () => mixer?.removeEventListener("finished", onFinished);
  }, [mixerRef]);

  // ── Détection de collision ──
  useEffect(() => {
    let frameId;

    const check = () => {
      frameId = requestAnimationFrame(check);

      if (phaseRef.current === PHASE_INTRO) return;
      if (!initializedRef.current) return;

      const items = spawnedItems?.current;
      const charBody = characterBody?.current;
      if (!items || items.length === 0 || !charBody) return;

      const cx = charBody.position.x;
      const cy = charBody.position.y;
      const cz = charBody.position.z;

      for (const item of items) {
        if (!item?.body) continue;
        const dx = cx - item.body.position.x;
        const dy = cy - item.body.position.y;
        const dz = cz - item.body.position.z;

        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < COLLISION_DISTANCE) {
          triggerIntro();
          break;
        }
      }
    };

    frameId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frameId);
  }, [spawnedItems, characterBody]);

  const triggerIntro = () => {
    if (phaseRef.current === PHASE_INTRO) return;

    const introActions = introActionsRef.current;
    const loopActions = loopActionsRef.current;
    if (!introActions || !loopActions) return;

    phaseRef.current = PHASE_INTRO;
    loopActions.forEach((a) => a.stop());
    introActions.forEach((a) => {
      a.reset();
      a.play();
    });
  };

  return null;
};

export default Interaction;
