import { useEffect, useRef } from "react";
import * as THREE from "three";

const ANIM_FPS = 25;
const COLLISION_DISTANCE = 1.2;

const LOOP_CLIP_NAME = "ArmatureAction.001";
const LOOP_START = 150 / ANIM_FPS;
const LOOP_END = 300 / ANIM_FPS;

const ITEM_ANIM = {
  bat: { start: 0 / ANIM_FPS, end: 150 / ANIM_FPS },
  plushie: { start: 300 / ANIM_FPS, end: 450 / ANIM_FPS },
  waffle: { start: 450 / ANIM_FPS, end: 600 / ANIM_FPS },
  knife: { start: 600 / ANIM_FPS, end: null },
};

// Plages de frames des yeux pour chaque état
const EYE_ANIM = {
  loop: { start: 150, end: 300 },
  bat: { start: 0, end: 149 },
  plushie: { start: 301, end: 449 },
  waffle: { start: 450, end: 599 },
  knife: { start: 600, end: 749 },
};

const PHASE_LOOP = "loop";
const PHASE_REACT = "react";

const Interaction = ({
  mixerRef,
  rawClips,
  spawnedItems,
  characterBody,
  isIntroRef,
  skeletonRef,
  healthManager,
  world,
  onEyeRangeChange, // ← nouveau callback : ({ start, end }) => void
}) => {
  const phaseRef = useRef(PHASE_LOOP);
  const initializedRef = useRef(false);
  const rafInitRef = useRef(null);
  const rafCheckRef = useRef(null);
  const cooldownRef = useRef(0);
  const currentAnimRef = useRef(null);
  const actionsRef = useRef([]);

  // ── Init ──
  useEffect(() => {
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;

      const mixer = mixerRef?.current;
      if (!mixer || !rawClips || rawClips.length === 0) {
        rafInitRef.current = requestAnimationFrame(tryInit);
        return;
      }

      mixer.stopAllAction();

      const loopClip = rawClips.find((c) => c.name === LOOP_CLIP_NAME);
      if (!loopClip) {
        rafInitRef.current = requestAnimationFrame(tryInit);
        return;
      }

      ITEM_ANIM.knife.end = loopClip.duration - 0.05;

      const actions = rawClips.map((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.time = LOOP_START;
        action.enabled = true;
        action.paused = false;
        action.play();
        return action;
      });
      actionsRef.current = actions;

      let waitFrames = 0;
      const waitAndCapture = () => {
        if (cancelled) return;
        if (++waitFrames < 4) {
          requestAnimationFrame(waitAndCapture);
          return;
        }
        mixer.setTime(LOOP_START);
        skeletonRef?.current?.captureRestPose();
        initializedRef.current = true;
        phaseRef.current = PHASE_LOOP;
        if (isIntroRef) isIntroRef.current = false;

        // Démarre avec la plage yeux du loop
        onEyeRangeChange?.(EYE_ANIM.loop);
      };
      requestAnimationFrame(waitAndCapture);
    };

    rafInitRef.current = requestAnimationFrame(tryInit);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafInitRef.current);
    };
  }, [mixerRef, rawClips, skeletonRef]);

  // ── Boucle de contrôle ──
  useEffect(() => {
    const check = () => {
      rafCheckRef.current = requestAnimationFrame(check);
      if (!initializedRef.current) return;

      const actions = actionsRef.current;
      if (!actions.length) return;

      const mainAction = actions.find(
        (a) => a.getClip().name === LOOP_CLIP_NAME,
      );
      if (!mainAction) return;

      if (phaseRef.current === PHASE_LOOP) {
        if (mainAction.time >= LOOP_END || mainAction.time < LOOP_START) {
          actions.forEach((a) => {
            a.paused = false;
            a.enabled = true;
            a.time = LOOP_START;
          });
        }

        if (cooldownRef.current > 0) {
          cooldownRef.current--;
          return;
        }

        const items = spawnedItems?.current;
        const charBody = characterBody?.current;

        if (!charBody || !items?.length) return;

        for (const item of [...items]) {
          if (!item?.body || item.consumed) continue;

          const dx = charBody.position.x - item.body.position.x;
          const dy = charBody.position.y - item.body.position.y;
          const dz = charBody.position.z - item.body.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < COLLISION_DISTANCE) {
            const anim = ITEM_ANIM[item.modelName];
            if (!anim) continue;

            item.consumed = true;

            if (world?.current) {
              world.current.removeBody(item.body);
            }

            const idx = spawnedItems.current.indexOf(item);
            if (idx !== -1) spawnedItems.current.splice(idx, 1);

            item.mesh.visible = false;

            item.body.collisionFilterGroup = 0;
            item.body.collisionFilterMask = 0;
            item.body.position.set(9999, 9999, 9999);
            item.body.velocity.set(0, 0, 0);
            item.body.angularVelocity.set(0, 0, 0);
            item.body.mass = 0;
            item.body.updateMassProperties();

            if (healthManager && item.stats) {
              healthManager.applyItemEffect(item.stats);
            }

            // Change la plage des yeux selon l'item
            const eyeRange = EYE_ANIM[item.modelName];
            if (eyeRange) onEyeRangeChange?.(eyeRange);

            currentAnimRef.current = anim;
            phaseRef.current = PHASE_REACT;
            if (isIntroRef) isIntroRef.current = true;
            skeletonRef?.current?.freezeSprings();

            actions.forEach((a) => {
              a.paused = false;
              a.enabled = true;
              a.time = anim.start;
            });

            break;
          }
        }
      } else if (phaseRef.current === PHASE_REACT) {
        const anim = currentAnimRef.current;
        if (!anim) return;

        if (mainAction.time >= anim.end) {
          actions.forEach((a) => {
            a.paused = false;
            a.enabled = true;
            a.time = LOOP_START;
          });
          phaseRef.current = PHASE_LOOP;
          currentAnimRef.current = null;
          cooldownRef.current = 60;

          // Retour à la plage yeux du loop
          onEyeRangeChange?.(EYE_ANIM.loop);

          requestAnimationFrame(() => {
            skeletonRef?.current?.captureRestPose();
            skeletonRef?.current?.unfreezeSprings();
            if (isIntroRef) isIntroRef.current = false;
          });
        }
      }
    };

    rafCheckRef.current = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafCheckRef.current);
  }, [
    mixerRef,
    spawnedItems,
    characterBody,
    isIntroRef,
    skeletonRef,
    healthManager,
    world,
    onEyeRangeChange,
  ]);

  return null;
};

export default Interaction;
