# Accessibility evaluation

## Method

Lighthouse 13.5.0 was run with headless Chrome against the local Dashboard,
Library, Wordle and Word Search routes on 8 October 2026. The audit command
creates HTML and JSON evidence under the ignored `lighthouse/results/` folder:

```sh
npm run dev
# In a second terminal:
npm run test:accessibility
```

The runner accepts `LIGHTHOUSE_BASE_URL` for another loopback port and
`CHROME_PATH` when Chrome or Edge is installed somewhere non-standard. It
refuses non-loopback targets so an assessment command cannot accidentally audit
or generate traffic against a public service.

## Results

| Route | Initial score | Final score | Failed automated audits |
| --- | ---: | ---: | ---: |
| Dashboard | 92 | 100 | 0 |
| Library | Not run before fixes | 100 | 0 |
| Wordle | Not run before fixes | 100 | 0 |
| Word Search | Not run before fixes | 100 | 0 |

The committed summary is in `lighthouse/baseline-results.csv`. Full HTML and
JSON reports remain local for the demonstration video and are excluded from the
submission archive because they contain generated browser diagnostics.

## Design changes prompted by Lighthouse

The first Dashboard audit found two problems:

1. The word-list completeness bar had an `aria-label` on a generic `div`, where
   that ARIA attribute was prohibited. It is now a named `progressbar` with
   explicit minimum, maximum, current and human-readable values.
2. The purple readiness percentage had only 2.37:1 contrast against the dark
   surface. Dark mode now uses a lighter purple that clears the large-text
   contrast requirement while preserving the interface palette.

The final automated accessibility score is 100 on all four primary routes.
Lighthouse does not replace human review: the video should also demonstrate
keyboard navigation, visible focus, meaningful labels and responsive zoom.
