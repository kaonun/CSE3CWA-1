import styles from "./page.module.css";

// Paste the unlisted YouTube embed URL here once the walkthrough is
// recorded, e.g. "https://www.youtube.com/embed/VIDEO_ID".
const VIDEO_URL = "";

export const metadata = {
  title: "About — Phoneme'le",
};

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <section>
        <h2>What is Phoneme&apos;le?</h2>
        <p>
          Phoneme&apos;le is a builder for phoneme-based classroom
          activities, made for Speech Pathology teachers preparing materials
          for students. Teachers build a Wordle or Word Search by clicking
          phonemes from an Australian English keyboard — never by typing IPA
          — preview it live, and export a single self-contained HTML file
          students can play offline, with no server and no build step.
        </p>
      </section>

      <section>
        <h2>Scope</h2>
        <p>
          This is Assessment 1 of CSE3CWA: a frontend-only application.
          There is no database and no dynamic word lists — the phoneme
          inventory is fixed, and the Word Search word list ships with
          editable defaults. Dynamic content is planned for Assessment 2.
        </p>
      </section>

      <section>
        <h2>The tools</h2>
        <dl className={styles.tools}>
          <div>
            <dt>Wordle</dt>
            <dd>
              Build a phoneme word, set the English equivalent, choose
              whether hints are shown and how many guesses are allowed, then
              preview and export a playable Wordle-style game.
            </dd>
          </div>
          <div>
            <dt>Word Search</dt>
            <dd>
              Build a word list from phonemes, choose a grid size and
              difficulty (diagonals and reversed words), then preview and
              export a phoneme word search.
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.video}>
        <h2>How it works</h2>
        {VIDEO_URL ? (
          <div className={styles.videoFrame}>
            <iframe
              src={VIDEO_URL}
              title="Phoneme'le walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className={styles.videoPlaceholder}>
            Video walkthrough coming soon.
          </p>
        )}
      </section>

      <section>
        <h2>Author</h2>
        <p>Ali Mhanna — 22550592</p>
      </section>
    </div>
  );
}
