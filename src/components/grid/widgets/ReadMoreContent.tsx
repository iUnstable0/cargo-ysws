"use client";

import type { WidgetProps } from "../types";
import Logo from "@/components/Logo";
import styles from "./ReadMoreContent.module.scss";

export function ReadMoreContent(_props: WidgetProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>What is Cargo?</h2>

      <p className={styles.description}>
        <span className={styles.brand}>Cargo</span> is a{" "}
        <a
          href="https://hackclub.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Hack Club
        </a>{" "}
        YSWS program designed for young developers (18 &amp; younger) to build
        and ship a free plugin, and get rewards.
      </p>

      <h3 className={styles.subheading}>How it works</h3>
      <ol className={styles.steps}>
        <li>Submit your plugin idea</li>
        <li>Wait for approval</li>
        <li>Once approved, start coding!</li>
        <li>Ship &amp; Publish your plugin</li>
        <li>Submit for prizes!</li>
      </ol>

      <h3 className={styles.subheading}>Criteria</h3>
      <ul className={styles.criteria}>
        <li>Plugin must be open source &amp; on GitHub</li>
        <li>Plugin must be free!</li>
        <li>Should have a demo video</li>
        <li>Solves a clear problem</li>
      </ul>
    </div>
  );
}
