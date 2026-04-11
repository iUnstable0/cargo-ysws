import Image from "next/image";

import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.titleCtn}>
      <div className={styles.title}>CARG</div>
      <Image
        src={"logo.svg"}
        width={"64"}
        height={"64"}
        objectFit={"cover"}
        alt={"Logo"}
      />
    </div>
  );
}
