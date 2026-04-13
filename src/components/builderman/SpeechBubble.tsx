import type { CSSProperties } from "react";
import styles from "./SpeechBubble.module.scss";

type SpeechBubbleProps = {
  text: string;
  showCursor?: boolean;
  style?: CSSProperties;
};

export default function SpeechBubble({
  text,
  showCursor = false,
  style,
}: SpeechBubbleProps) {
  return (
    <div className={styles.bubble} style={style}>
      <span className={styles.text}>
        {text}
        {showCursor && <span className={styles.cursor} />}
      </span>

      <svg
        className={styles.tail}
        width="24"
        height="16"
        viewBox="0 0 24 16"
      >
        <polygon
          points="0,0 24,0 12,16"
          fill="#eddcc9"
          stroke="#653a1b"
          strokeWidth="2"
        />
        <polygon points="1,0 23,0 12,14" fill="#eddcc9" />
      </svg>
    </div>
  );
}
