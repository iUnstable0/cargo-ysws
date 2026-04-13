"use client";

import type { WidgetProps } from "../types";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/mp/Accordion";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import styles from "./FaqContent.module.scss";

function FaqTrigger({
  children,
  expanded,
  ...props
}: {
  children: React.ReactNode;
  expanded?: boolean;
  value?: React.Key;
}) {
  return (
    <AccordionTrigger className={styles.trigger} {...props}>
      <motion.span
        animate={{ rotate: expanded ? 90 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{ display: "inline-flex", flexShrink: 0 }}
      >
        <ChevronRight style={{ width: "1em", height: "1em" }} />
      </motion.span>
      {children}
    </AccordionTrigger>
  );
}

export function FaqContent(_props: WidgetProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>FAQ</h2>

      <Accordion
        className={styles.list}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <AccordionItem value="participate" className={styles.item}>
          <FaqTrigger>Who can participate?</FaqTrigger>
          <AccordionContent className={styles.answer}>
            You must be 18 years old or younger.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="team" className={styles.item}>
          <FaqTrigger>Can I work in a team?</FaqTrigger>
          <AccordionContent className={styles.answer}>
            No — Cargo is an individual program. You must work solo.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="double-dip" className={styles.item}>
          <FaqTrigger>Can I double dip?</FaqTrigger>
          <AccordionContent className={styles.answer}>
            No, you can&apos;t combine this with other YSWS programs.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="earn" className={styles.item}>
          <FaqTrigger>How much can I earn?</FaqTrigger>
          <AccordionContent className={styles.answer}>
            Work as much as you want, but you&apos;re rewarded for up to 10
            hours ($50 in prizes).
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="more-questions" className={styles.item}>
          <FaqTrigger>Have more questions?</FaqTrigger>
          <AccordionContent className={styles.answer}>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
