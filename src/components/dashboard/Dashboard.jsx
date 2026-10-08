import Link from "next/link";
import DashboardIcon from "./DashboardIcon";
import styles from "./Dashboard.module.css";

function MetricCard({ metric }) {
  return (
    <article className={`${styles.metricCard} ${styles[metric.tone]}`}>
      <div className={styles.metricTopline}>
        <span className={styles.metricIcon}>
          <DashboardIcon name={metric.icon} className={styles.icon} />
        </span>
        <span className={styles.metricBadge}>{metric.badge}</span>
      </div>
      <p className={styles.metricLabel}>{metric.label}</p>
      <p className={styles.metricValue}>{metric.value}</p>
      <p className={styles.metricDetail}>{metric.detail}</p>
    </article>
  );
}

function GenerationChart({ data, totals }) {
  const maxTotal = Math.max(
    ...data.map((item) => item.successful + item.failed),
  );

  return (
    <article className={`${styles.panel} ${styles.chartPanel}`}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Generation activity</h2>
          <p>Successful and failed outputs over the simulated sample week</p>
        </div>
        <div className={styles.legend} aria-label="Chart legend">
          <span><i className={styles.successDot} />Successful</span>
          <span><i className={styles.failureDot} />Failed</span>
        </div>
      </div>

      <figure
        className={styles.chart}
        aria-label={`${totals.successful} successful and ${totals.failed} failed generations`}
      >
        <div className={styles.chartGrid} aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <div className={styles.bars}>
          {data.map((item) => (
            <div
              className={styles.barGroup}
              key={item.day}
              aria-label={`${item.day}: ${item.successful} successful and ${item.failed} failed`}
            >
              <div className={styles.barTrack}>
                <span
                  className={styles.failureBar}
                  style={{
                    height: `${Math.max((item.failed / maxTotal) * 100, item.failed ? 2 : 0)}%`,
                  }}
                />
                <span
                  className={styles.successBar}
                  style={{ height: `${(item.successful / maxTotal) * 100}%` }}
                />
              </div>
              <span className={styles.day}>{item.day}</span>
            </div>
          ))}
        </div>
      </figure>

      <div className={styles.totals}>
        <div><strong>{totals.total}</strong><span>Total</span></div>
        <div><strong>{totals.successful}</strong><span>Successful</span></div>
        <div><strong>{totals.failed}</strong><span>Failed</span></div>
      </div>
    </article>
  );
}

function ActivityMix({ data }) {
  const wordlePercentage = data[0].percentage;
  const mostUsed = data.find((item) => item.isMostUsed);

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Activity mix</h2>
          <p>Usage by activity type in the simulated sample</p>
        </div>
      </div>

      <div className={styles.donutWrap}>
        <div
          className={styles.donut}
          role="img"
          aria-label={`${wordlePercentage}% Wordle and ${100 - wordlePercentage}% Word Search usage`}
          style={{
            background: `conic-gradient(#654cc5 0 ${wordlePercentage}%, #469369 ${wordlePercentage}% 100%)`,
          }}
        />
        <div className={styles.donutCentre}>
          <strong>{data.reduce((total, item) => total + item.usage, 0)}</strong>
          <span>Sessions</span>
        </div>
      </div>

      <div className={styles.mixList}>
        {data.map((item) => (
          <div className={styles.mixItem} key={item.type}>
            <span className={`${styles.typeIcon} ${item.type === "Wordle" ? styles.wordle : styles.wordSearch}`}>
              <DashboardIcon
                name={item.type === "Wordle" ? "wordle" : "search"}
                className={styles.iconSmall}
              />
            </span>
            <div>
              <strong>{item.type}</strong>
              <span>{item.count} saved · {item.usage} sessions</span>
            </div>
            <b>{item.percentage}%</b>
          </div>
        ))}
      </div>
      <p className={styles.insight}><strong>{mostUsed.type}</strong> is the most-used activity type.</p>
    </article>
  );
}

function RecentActivities({ activities, simulated }) {
  return (
    <article className={`${styles.panel} ${styles.activityPanel}`}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Recent activities</h2>
          <p>Latest Wordle and Word Search configurations</p>
        </div>
        <span className={styles.sourceBadge}>{simulated ? "Sample preview" : "Live database"}</span>
      </div>

      <div className={styles.tableScroll}>
        <table>
          <caption className={styles.visuallyHidden}>Recent activity configurations</caption>
          <thead>
            <tr>
              <th scope="col">Activity</th>
              <th scope="col">Type</th>
              <th scope="col">Difficulty</th>
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.id}>
                <th scope="row">
                  <span className={styles.activityTitle}>{activity.title}</span>
                  <span className={styles.activityList}>{activity.wordListTitle}</span>
                </th>
                <td>{activity.type === "wordle" ? "Wordle" : "Word Search"}</td>
                <td>{activity.difficulty}</td>
                <td><span className={styles.status}>{activity.status}</span></td>
                <td>{activity.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function Alerts({ alerts }) {
  return (
    <article className={styles.panel} id="dashboard-alerts">
      <div className={styles.panelHeader}>
        <div>
          <h2>Alerts</h2>
          <p>Operational items that need a closer look</p>
        </div>
        <span className={styles.alertCount}>{alerts.length}</span>
      </div>
      <ul className={styles.alertList}>
        {alerts.map((alert) => (
          <li className={`${styles.alert} ${styles[alert.severity]}`} key={alert.id}>
            <span className={styles.alertIcon}>
              <DashboardIcon name="alert" className={styles.iconSmall} />
            </span>
            <div><strong>{alert.title}</strong><p>{alert.detail}</p></div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function WordListReadiness({ summary }) {
  return (
    <article className={styles.panel}>
      <div className={styles.readinessHeader}>
        <div><h2>Word list readiness</h2><p>Stored vocabulary availability</p></div>
        <strong>{summary.completeness}%</strong>
      </div>
      <div className={styles.progress} aria-label={`${summary.completeness}% of saved lists contain words`}>
        <span style={{ width: `${summary.completeness}%` }} />
      </div>
      <div className={styles.readinessStats}>
        <div><strong>{summary.populatedLists}/{summary.totalLists}</strong><span>Populated lists</span></div>
        <div><strong>{summary.totalWords}</strong><span>Available words</span></div>
      </div>
      {summary.recentlyUpdated.length > 0 ? (
        <ul className={styles.recentLists}>
          {summary.recentlyUpdated.map((list) => (
            <li key={list.id}><span><strong>{list.title}</strong><small>{list.wordCount} words</small></span><time>{list.updatedAt}</time></li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyState}>No word lists are stored yet. Create one in the Library.</p>
      )}
    </article>
  );
}

export default function Dashboard({ data }) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.statusRow}>
        <p className={styles.dataNote}>{data.dataNote}</p>
        <Link
          className={`${styles.healthBadge} ${data.databaseStatus === "connected" ? styles.connected : styles.disconnected}`}
          href="/health/database"
        >
          <span aria-hidden="true" />
          Database {data.databaseStatus}
        </Link>
      </div>

      <section className={styles.metrics} aria-label="Key performance indicators">
        {data.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
      </section>

      <section className={styles.reporting} aria-label="Generation reporting">
        <GenerationChart data={data.weeklyUsage} totals={data.generationTotals} />
        <ActivityMix data={data.activityMix} />
      </section>

      <section className={styles.operations} aria-label="Operational details">
        <RecentActivities activities={data.recentActivities} simulated={data.recentActivitiesAreSimulated} />
        <div className={styles.sideStack}>
          <Alerts alerts={data.alerts} />
          <WordListReadiness summary={data.wordListSummary} />
        </div>
      </section>
    </div>
  );
}
