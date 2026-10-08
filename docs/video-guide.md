# Assignment 3 demonstration video guide

Target length: about 6 minutes. The submitted recording must be 3–8 minutes and
must show your face, voice and student ID.

## Before recording

1. Run `npm ci`, then `npm run check`.
2. Start the application with `npm run dev`.
3. In another terminal, run `npm run test:accessibility` and keep one generated
   HTML report open.
4. Keep the latest JMeter dashboard, Playwright output and GitHub commit history
   ready in separate windows.
5. Use a word list with enough words to demonstrate both builders without
   typing large amounts of data during the recording.

## Suggested timeline

| Time | Demonstration and talking points |
| --- | --- |
| 0:00–0:30 | Show your face and student ID. State that Assignment 3 extends the same Assessment 1–2 Next.js project. |
| 0:30–1:30 | Open Dashboard. Explain live SQLite totals, labelled simulated history, success/failure metrics, average page time, activity mix, readiness and alerts. |
| 1:30–2:30 | In Library, create or update a list/configuration. Open a saved activity, generate it, interact with the preview and download the self-contained HTML. |
| 2:30–3:10 | Open `/health`, `/health/database` and `/health/metrics`. Explain that generation attempts and bounded page durations persist to reporting aggregates. |
| 3:10–3:50 | Show the two passing Playwright tests: teacher CRUD and the student solve/download workflow. Mention isolated temporary databases. |
| 3:50–4:35 | Show JMeter results for staged traffic. Discuss zero-error local baseline results and explain why 1,000/10,000 users require an appropriately sized or distributed injector. |
| 4:35–5:20 | Show Lighthouse’s four 100 accessibility scores and the HTML report. Explain the progressbar semantics and dark-mode contrast fixes. Demonstrate keyboard focus briefly. |
| 5:20–6:00 | Show GitHub `assessment-3` and `master`, the sequence of commits, and the preserved `assessment-2` branch. Summarise the data flow from UI to API, SQLite and Dashboard. |

Do not claim that Lighthouse proves complete accessibility or that the local
load test represents internet-scale capacity. Describe the measured evidence
and its limits directly.
