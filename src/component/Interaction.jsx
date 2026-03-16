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
  const actionsRef = useRef([]);

  useEffect(() => {
    const tryInit = () => {
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
