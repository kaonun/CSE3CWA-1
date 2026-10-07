import styles from "./page.module.css";

const VIDEO_URL = "https://www.youtube-nocookie.com/embed/pqoXVBFV7K4";
const YOUTUBE_URL = "https://youtu.be/pqoXVBFV7K4";

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
          The builder now uses a server to prepare classroom activities.
          Downloaded HTML games still work offline. The Teacher Library stores
          word lists, words, hints, and multiple activity configurations in a
          database. Generation from those saved configurations is the next
          development step; the existing builders still use temporary editor
          values that reset on refresh.
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
        <h2>Assessment 1 walkthrough</h2>
        <p>This video demonstrates the original interface, before server-side generation was added.</p>
        <div className={styles.videoFrame}>
          <iframe
            src={VIDEO_URL}
            title="Phoneme'le application walkthrough"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <p className={styles.videoLink}>
          If the embedded player is unavailable,{" "}
          <a href={YOUTUBE_URL} target="_blank" rel="noreferrer">
            watch the walkthrough on YouTube
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Author</h2>
        <p>Ali Mhanna — 22550592</p>
      </section>
    </div>
  );
}
