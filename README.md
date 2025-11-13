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
