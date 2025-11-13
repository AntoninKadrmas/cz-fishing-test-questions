# Google Forms scraper (TypeScript)

This project rewrites the old `scrape.js` scraper in TypeScript.

Quick start

1. Install dependencies:

```powershell
pnpm install
```

2. Run in development (uses `ts-node`):

```powershell
# run headless (default)
pnpm run dev

# or run with a visible browser for debugging
# (set HEADLESS=false)
$env:HEADLESS = "false"; pnpm run dev
```

3. Build and run compiled JavaScript:

```powershell
pnpm run build
pnpm start
```

Options

- When running directly, you can pass an output filename as the first argument. Example:

```powershell
pnpm run dev -- output.json
```

Notes

- The scraper uses `puppeteer` and relies on DOM selectors used by Google Forms. If Google changes their markup, selectors may need updates.
- If Chromium wasn't downloaded during install (package manager may skip install scripts), running the scraper will attempt to download or use an existing Chrome/Chromium installation.
- The exported function `scrapeGoogleForm(url, outputFile)` is available in `src/scrape.ts` for reuse.

## Known issues

- Bullet-point style questions: one of the forms in this workspace uses a bullet-point (non-standard) layout that the scraper does not parse correctly yet. The current scraped output for that form is available at `src/form/form_data_dLFEEn53sVDxE9yk7.json`. Questions from that form may be missing or malformed until the parser is extended to handle that layout.

## Files ignored by Git

- A `.gitignore` was added to the repository root to exclude local artifacts and generated data such as `node_modules/`, `debug/`, and `src/form/*.json`.

## Contributing / Next steps

- If you'd like the scraper to support the bullet-point form, I can update the extraction logic to detect and handle those question blocks. This typically requires inspecting the HTML structure in `debug/results-page.html` for that form and adding corresponding selectors in `src/scrape.ts`.

If you want me to implement that next, say so and I'll add it to the plan and work on it.
