import Logo from "@/components/logo";

import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.bg}>
      <div className={styles.pageTitle}>
        <Logo size={128} />
      </div>
    </div>
  );
}
