"use client";

import type { WidgetProps } from "../types";
import styles from "./FaqContent.module.scss";

export function FaqContent(_props: WidgetProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>FAQ</h2>

      <div className={styles.item}>
        <dt className={styles.question}>Who can participate?</dt>
        <dd className={styles.answer}>
          You must be 18 years old or younger.
        </dd>
      </div>

      <div className={styles.item}>
        <dt className={styles.question}>Can I work in a team?</dt>
        <dd className={styles.answer}>
          No — Cargo is an individual program. You must work solo.
        </dd>
      </div>

      <div className={styles.item}>
        <dt className={styles.question}>Can I double dip?</dt>
        <dd className={styles.answer}>
          No, you can&apos;t combine this with other YSWS programs.
        </dd>
      </div>

      <div className={styles.item}>
        <dt className={styles.question}>How much can I earn?</dt>
        <dd className={styles.answer}>
          Work as much as you want, but you&apos;re rewarded for up to 10 hours
          ($50 in prizes).
        </dd>
      </div>

      <div className={styles.item}>
        <dt className={styles.question}>Have more questions?</dt>
        <dd className={styles.answer}>
          Ask in{" "}
          <a
            href="https://hackclub.slack.com/archives/cargo-ysws"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            #cargo-ysws
          </a>{" "}
          on the Hack Club Slack!
        </dd>
      </div>
    </div>
  );
}
