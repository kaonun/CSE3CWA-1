import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import {
  readDashboardData,
  unavailableDashboardData,
} from "@/lib/dashboard/metrics.mjs";
import styles from "./page.module.css";

export const metadata = {
  title: "Dashboard | Phoneme'le",
  description:
    "Operational metrics and reporting for phoneme-based classroom activities.",
};

async function loadDashboardData() {
  try {
    return await readDashboardData();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Dashboard data could not be loaded:", error);
    return unavailableDashboardData();
  }
}

async function DashboardData() {
  const data = await loadDashboardData();
  return <Dashboard data={data} />;
}

function DashboardLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.loadingBar} />
      <span className={styles.loadingBar} />
      <span className={styles.loadingBar} />
      <span className={styles.loadingBar} />
      <span className={styles.visuallyHidden}>Loading dashboard data</span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Workspace overview</p>
          <h2>Activity dashboard</h2>
          <p className={styles.lead}>
            Monitor builder content, generation health and usage patterns from
            one reporting view.
          </p>
        </div>
        <Link href="/library" className={styles.action}>
          Open teacher library <span aria-hidden="true">→</span>
        </Link>
      </header>

      <Suspense fallback={<DashboardLoading />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
