import { useEffect, useRef } from "react";
import * as THREE from "three";

const ANIM_FPS = 25;
const COLLISION_DISTANCE = 1.2;

const START_TIME = 0;
const MID_TIME = 150 / ANIM_FPS; // 6.0s
const END_TIME = 300 / ANIM_FPS; // 12.0s

const PHASE_LOOP = "loop";
const PHASE_INTRO = "intro";

const Interaction = ({
  mixerRef,
  rawClips,
  spawnedItems,
  characterBody,
  isIntroRef,
  skeletonRef,
}) => {
  const phaseRef = useRef(PHASE_LOOP);
  const actionsRef = useRef(null);
  const initializedRef = useRef(false);
  const rafInitRef = useRef(null);
  const rafCheckRef = useRef(null);

  // ── Init : crée les actions et capture la rest pose à frame 150 ──
  useEffect(() => {
    const tryInit = () => {
      const mixer = mixerRef?.current;
      if (!mixer || !rawClips || rawClips.length === 0) {
        rafInitRef.current = requestAnimationFrame(tryInit);
        return;
      }

      mixer.stopAllAction();

      const actions = rawClips.map((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.time = MID_TIME;
        action.play();
        return action;
      });

      actionsRef.current = actions;

      // Laisse 3 frames au mixer pour appliquer la pose à frame 150
      // puis capture les quaternions au repos pour Skeleton
      let waitFrames = 0;
      const waitAndCapture = () => {
        waitFrames++;
        if (waitFrames < 4) {
          requestAnimationFrame(waitAndCapture);
          return;
        }
        // Force l'évaluation à MID_TIME
        mixer.setTime(MID_TIME);

        // Capture la rest pose sur Skeleton maintenant que les bones sont à frame 150
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

  // ── Boucle : contrôle bornes + collision ──
  useEffect(() => {
    const check = () => {
      rafCheckRef.current = requestAnimationFrame(check);
      if (!initializedRef.current) return;

      const actions = actionsRef.current;
      if (!actions) return;

      if (phaseRef.current === PHASE_LOOP) {
        // Maintient dans [MID_TIME, END_TIME]
        actions.forEach((a) => {
          if (a.time >= END_TIME || a.time < MID_TIME) {
            a.time = MID_TIME;
          }
        });

        // Détection de collision
        const items = spawnedItems?.current;
        const charBody = characterBody?.current;
        if (items && items.length > 0 && charBody) {
          const cx = charBody.position.x;
          const cy = charBody.position.y;
          const cz = charBody.position.z;

          for (const item of items) {
            if (!item?.body) continue;
            const dx = cx - item.body.position.x;
            const dy = cy - item.body.position.y;
            const dz = cz - item.body.position.z;

            if (Math.sqrt(dx * dx + dy * dy + dz * dz) < COLLISION_DISTANCE) {
              phaseRef.current = PHASE_INTRO;
              if (isIntroRef) isIntroRef.current = true;
              skeletonRef?.current?.freezeSprings();
              actions.forEach((a) => {
                a.time = START_TIME;
              });
              break;
            }
          }
        }
      } else if (phaseRef.current === PHASE_INTRO) {
        const done = actions.every((a) => a.time >= MID_TIME);
        if (done) {
          actions.forEach((a) => {
            a.time = MID_TIME;
          });
          phaseRef.current = PHASE_LOOP;

          // Recapture la rest pose au retour à frame 150
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
  }, [spawnedItems, characterBody, isIntroRef, skeletonRef]);

  return null;
};

export default Interaction;
