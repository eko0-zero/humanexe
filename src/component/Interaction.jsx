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

const PHASE_LOOP = "loop";
const PHASE_REACT = "react";

const Interaction = ({
  mixerRef,
  rawClips,
  spawnedItems,
  characterBody,
  isIntroRef,
  skeletonRef,
}) => {
  const phaseRef = useRef(PHASE_LOOP);
  const initializedRef = useRef(false);
  const rafInitRef = useRef(null);
  const rafCheckRef = useRef(null);
  const cooldownRef = useRef(0);
  const currentAnimRef = useRef(null);
  const actionRef = useRef(null);

  // ── Init ──
  useEffect(() => {
    const tryInit = () => {
      const mixer = mixerRef?.current;
      if (!mixer || !rawClips || rawClips.length === 0) {
        rafInitRef.current = requestAnimationFrame(tryInit);
        return;
      }

      // Stoppe et désactive TOUS les clips sans exception
      mixer.stopAllAction();
      rawClips.forEach((clip) => {
        const a = mixer.clipAction(clip);
        a.enabled = false;
        a.weight = 0;
        a.stop();
      });

      // Trouve le clip principal
      const loopClip = rawClips.find((c) => c.name === LOOP_CLIP_NAME);
      if (!loopClip) {
        console.warn("Clip introuvable :", LOOP_CLIP_NAME);
        rafInitRef.current = requestAnimationFrame(tryInit);
        return;
      }

      // Calcule la fin réelle de knife depuis la durée du clip
      ITEM_ANIM.knife.end = loopClip.duration - 0.05;

      // Lance UNIQUEMENT l'action principale
      const action = mixer.clipAction(loopClip);
      action.enabled = true;
      action.weight = 1;
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.time = LOOP_START;
      action.play();
      actionRef.current = action;

      // Attend quelques frames puis capture la rest pose
      let waitFrames = 0;
      const waitAndCapture = () => {
        if (++waitFrames < 4) {
          requestAnimationFrame(waitAndCapture);
          return;
        }
        mixer.setTime(LOOP_START);
        skeletonRef?.current?.captureRestPose();
        initializedRef.current = true;
        phaseRef.current = PHASE_LOOP;
        if (isIntroRef) isIntroRef.current = false;
      };
      requestAnimationFrame(waitAndCapture);
    };

    rafInitRef.current = requestAnimationFrame(tryInit);
    return () => cancelAnimationFrame(rafInitRef.current);
  }, [mixerRef, rawClips, skeletonRef]);

  // ── Boucle de contrôle ──
  useEffect(() => {
    const check = () => {
      rafCheckRef.current = requestAnimationFrame(check);
      if (!initializedRef.current) return;

      const action = actionRef.current;
      if (!action) return;

      // ── LOOP : maintient entre LOOP_START et LOOP_END ──
      if (phaseRef.current === PHASE_LOOP) {
        if (action.time >= LOOP_END || action.time < LOOP_START) {
          action.time = LOOP_START;
        }

        if (cooldownRef.current > 0) {
          cooldownRef.current--;
          return;
        }

        // Détection collision
        const items = spawnedItems?.current;
        const charBody = characterBody?.current;
        if (!items?.length || !charBody) return;

        for (const item of items) {
          if (!item?.body) continue;
          const dx = charBody.position.x - item.body.position.x;
          const dy = charBody.position.y - item.body.position.y;
          const dz = charBody.position.z - item.body.position.z;

          if (Math.sqrt(dx * dx + dy * dy + dz * dz) < COLLISION_DISTANCE) {
            const anim = ITEM_ANIM[item.modelName];
            if (!anim) continue;

            currentAnimRef.current = anim;
            phaseRef.current = PHASE_REACT;
            if (isIntroRef) isIntroRef.current = true;
            skeletonRef?.current?.freezeSprings();
            action.time = anim.start;
            break;
          }
        }
      }

      // ── REACT : joue jusqu'à anim.end puis retour loop ──
      else if (phaseRef.current === PHASE_REACT) {
        const anim = currentAnimRef.current;
        if (!anim) return;

        if (action.time >= anim.end) {
          action.time = LOOP_START;
          phaseRef.current = PHASE_LOOP;
          currentAnimRef.current = null;
          cooldownRef.current = 60;

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
  }, [mixerRef, spawnedItems, characterBody, isIntroRef, skeletonRef]);

  return null;
};

export default Interaction;
