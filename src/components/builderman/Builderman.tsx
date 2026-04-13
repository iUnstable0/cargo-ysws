"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

import useDialogue from "@/hooks/useDialogue";
import { preload } from "@/lib/dialogueAudio";
import SpeechBubble from "./SpeechBubble";
import styles from "./Builderman.module.scss";

type BuildermanState = "idle" | "entering" | "dialogue" | "exiting";

const FIRST_DIALOGUE = [
  {
    text: "hii im hank but people call me the builderman",
    image: "/normal_builderman.png",
  },
  {
    text: "wait... what are you doing here anyways? this site's not done yet!",
    image: "/normal_builderman.png",
  },
  {
    text: "if you need any help just call me. ill be around.. i guess.",
    image: "/winking_builderman.png",
  },
  {
    text: "anyways gotta get back to work, cya <3",
    image: "/winking_builderman.png",
  },
];

const RETURN_DIALOGUE = [
  {
    text: "hi again. im super busy rn",
    image: "/normal_builderman.png",
  },
  {
    text: "go check out the site or something idk, ill be here if you need me",
    image: "/winking_builderman.png",
  },
];

const ANNOYED_DIALOGUE = [
  {
    text: "whats your problem?",
    image: "/normal_builderman.png",
  },
  {
    text: "jk id never get angry.. \u263A\uFE0F",
    image: "/winking_builderman.png",
  },
  {
    text: "just go play roblox or sth",
    image: "/winking_builderman.png",
  },
];

const BUSY_DIALOGUE = [
  {
    text: "im busy rn",
    image: "/normal_builderman.png",
  },
];

export default function Builderman() {
  const [state, setState] = useState<BuildermanState>("idle");
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [dialogueImage, setDialogueImage] = useState("/normal_builderman.png");
  const [isBlinking, setIsBlinking] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("builderman-spoken") === "true";
  });
  const [clickCount, setClickCount] = useState(0);
  const [alreadyAngry, setAlreadyAngry] = useState(false);
  const blinkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dialogueLines = alreadyAngry
    ? BUSY_DIALOGUE
    : clickCount >= 5
      ? ANNOYED_DIALOGUE
      : hasSpoken
        ? RETURN_DIALOGUE
        : FIRST_DIALOGUE;
  const isDialogue = state === "dialogue";
  const currentLine = dialogueLines[dialogueIndex];

  // Determine which image to show
  const currentImage =
    state === "idle" && isBlinking
      ? "/blinking_builderman.png"
      : state === "idle" || state === "entering" || state === "exiting"
        ? "/normal_builderman.png"
        : dialogueImage;

  const { displayedText, isComplete, skip } = useDialogue(
    currentLine?.text ?? "",
    { enabled: isDialogue },
  );

  // Idle blinking effect
  useEffect(() => {
    if (state !== "idle") {
      setIsBlinking(false);
      return;
    }

    let cancelled = false;

    function scheduleBlink() {
      const delay = 3000 + Math.random() * 2000;
      const t1 = setTimeout(() => {
        if (cancelled) return;
        setIsBlinking(true);
        const t2 = setTimeout(() => {
          if (cancelled) return;
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
        blinkTimers.current.push(t2);
      }, delay);
      blinkTimers.current.push(t1);
    }

    scheduleBlink();

    return () => {
      cancelled = true;
      blinkTimers.current.forEach(clearTimeout);
      blinkTimers.current = [];
    };
  }, [state]);

  const handleClick = useCallback(() => {
    if (state === "idle") {
      preload();
      setClickCount((c) => c + 1);
      setState("entering");
      return;
    }
    if (state === "dialogue") {
      const isAnnoyed = clickCount >= 5 && !alreadyAngry;
      if (isComplete) {
        // Tap to advance to next line, or exit after last line
        if (dialogueIndex < dialogueLines.length - 1) {
          const nextIndex = dialogueIndex + 1;
          setDialogueIndex(nextIndex);
          setDialogueImage(dialogueLines[nextIndex].image);
        } else {
          if (!hasSpoken) {
            localStorage.setItem("builderman-spoken", "true");
            setHasSpoken(true);
          }
          if (clickCount >= 5 && !alreadyAngry) {
            setAlreadyAngry(true);
          }
          setState("exiting");
        }
      } else if (!isAnnoyed) {
        skip();
      }
    }
  }, [state, isComplete, dialogueIndex, dialogueLines, hasSpoken, alreadyAngry, clickCount, skip]);

  const handleAnimationComplete = useCallback(() => {
    if (state === "entering") {
      setState("dialogue");
      setDialogueIndex(0);
      setDialogueImage(dialogueLines[0].image);
    }
    if (state === "exiting") {
      setState("idle");
      setDialogueIndex(0);
    }
  }, [state, dialogueLines]);

  const isOut = state === "idle" || state === "exiting";

  return (
    <motion.div
      className={`${styles.container}${!isOut ? ` ${styles.active}` : ""}`}
      onClick={handleClick}
      animate={{ x: isOut ? "60%" : "0%" }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      onAnimationComplete={handleAnimationComplete}
      initial={{ x: "60%" }}
    >
      <div className={styles.imageWrapper}>
        <AnimatePresence>
          {isDialogue && displayedText && (
            <motion.div
              className={styles.speechBubbleWrapper}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <SpeechBubble text={displayedText} showCursor={!isComplete} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt="Builderman"
          className={styles.buildermanImage}
          draggable={false}
        />
      </div>
    </motion.div>
  );
}
