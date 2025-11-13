# Scrape — forms and eTesty question scrapers

Lightweight TypeScript scrapers that extract questions and answers from Google Forms and a fishing-test site and save them as JSON files.

## At a glance

- Name: scrape
- Language: TypeScript
- Main libs: puppeteer (browser automation), dotenv (env), openai (present in deps but not used by scraper code)
- Source: `src/` — main scrapers are `src/scrape-form.ts` and `src/scrape-etesty.ts` (and `src/alt-scrape.ts`).
- Example outputs: JSON files under `src/form/` and `src/etesty/` (already committed samples exist).

## What this repo does

- `src/scrape-form.ts` — navigates Google Forms, selects answers, submits the form, navigates to the "view results" page and extracts questions, options, image URLs and correct/incorrect indicators when present. It writes per-form JSON files (e.g. `src/form/form_data_<id>.json`).
- `src/scrape-etesty.ts` — scrapes pages from `rybar.etesty.cz` (fishing test). It discovers question links, opens each question, reveals the correct answer and saves the results to `src/etesty/*.json` files.
- `src/alt-scrape.ts` — alternate scraping helper (similar tasks).
- `scripts/count_unique_questions.js` — helper script that reads all JSON files in `src/form`, computes unique questions (by question text + answers), and prints summary statistics.

## Prerequisites

- Node.js (LTS recommended)
- pnpm (the repository used pnpm in the developer environment) — but npm or yarn will also work if you adapt commands.
- Puppeteer will download a Chromium binary by default. Ensure you have sufficient disk space and a supported OS.

## Install

Open PowerShell in the repo root and run:

```powershell
pnpm install
```

If you don't use `pnpm`, run `npm install` instead.

## Build / TypeScript

Compile TypeScript to `dist/`:

```powershell
pnpm run build
```

The `tsconfig.json` targets ES2020 and outputs CommonJS modules to `dist/`.

## Environment variables

- HEADLESS — set to `false` to run Puppeteer with a visible browser window (useful for debugging). Default behavior launches headless unless `HEADLESS=false`.
- SCRAPER_DEBUG — set to `true` to save the HTML of the results page to `./debug/results-page.html` when scraping Google Forms.

Set variables in PowerShell like this (one-liners shown for convenience):

```powershell
#$env:HEADLESS = "false"
#$env:SCRAPER_DEBUG = "true"
```

Or use a `.env` file together with `dotenv` if you add code to load it; as-is the repo depends on `dotenv` in `package.json` but the scrapers directly use `process.env`.

## Scripts / Usage

- Build: `pnpm run build`
- Scrape Google Forms: `pnpm run scrape:form` — this will execute `ts-node src/scrape-form.ts`.
- Scrape eTesty (fishing test): `pnpm run scrape:etesty` — runs `ts-node src/scrape-etesty.ts`.

Examples (PowerShell):

```powershell
# run the Google Form scraper (headless):
pnpm run scrape:form

# run the Google Form scraper with visible browser for debugging
$env:HEADLESS = 'false'; pnpm run scrape:form

# run the eTesty scraper
pnpm run scrape:etesty
```

Notes:
- The scrapers, when executed directly, iterate over lists of URLs defined in `src/urls.ts` and write per-form JSON files into `src/form/` or `src/etesty/`.
- If you want to scrape a single form, edit the invocation in the `if (require.main === module)` block in the corresponding `.ts` file or call `scrapeGoogleForm(url, outFile)` from a small runner.

## Data layout

- `src/form/` — JSON files produced by the Google Forms scraper. Each file is an array of question objects with the shape:

```json
{
  "question": "...",
  "type": "multiple_choice|paragraph|short_answer|unknown",
  "options": [{ "text": "...", "isCorrect": true|false|undefined }],
  "image_url": null | "...",
  "correctAnswers": ["..."]
}
```

- `src/etesty/` — JSON files produced by the eTesty scraper. Each item contains `question`, `options`, `image_url`, `correctAnswers`, and `url`.

## Helpers

Use the included helper to count unique questions in `src/form`:

```powershell
node scripts/count_unique_questions.js
```

It prints total questions processed, unique count and duplicate groups.

## Notes, caveats and next steps

- The project depends on `openai` in `package.json` but the current scrapers do not call the OpenAI API. Remove or use that dependency as needed.
- Puppeteer can be flaky on CI or headless environments that lack required libs; run locally first to confirm.
- Consider adding a small CLI wrapper to pass a single URL and output destination (instead of editing `urls.ts`).
- Tests and linting are not present; adding a minimal test harness would help validate JSON output shapes.

## Contributing

1. Fork the repo
2. Create a branch for your feature/fix
3. Run `pnpm install` and `pnpm run build` before sending a PR

## License

ISC
