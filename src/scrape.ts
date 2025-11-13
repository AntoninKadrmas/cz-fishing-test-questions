import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { urls } from "./urls";

type QuestionType =
  | "multiple_choice"
  | "paragraph"
  | "short_answer"
  | "unknown";

export interface Option {
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  question: string;
  type: QuestionType;
  options: Option[];
  image_url?: string | null;
  correctAnswers?: string[];
}

/**
 * Scrape a Google Form and write results to a JSON file.
 * - When run via `npm run dev` you can set HEADLESS=false to see the browser.
 * - This version selects all checkboxes, submits the form, views results,
 *   and extracts correct/incorrect answer information.
 */
export async function scrapeGoogleForm(
  url: string,
  outputFile = "form_data.json"
): Promise<Question[]> {
  const headless = process.env.HEADLESS !== "false";
  const browser = await puppeteer.launch({ headless });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // give the form's JS a moment to render
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("📝 Selecting all checkboxes on the form...");

    // Select all checkboxes on the form
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll(
        'div[role="checkbox"], div[role="radio"]'
      );
      checkboxes.forEach((checkbox) => {
        const isChecked = checkbox.getAttribute("aria-checked") === "true";
        if (!isChecked) {
          (checkbox as HTMLElement).click();
        }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("✅ All checkboxes selected. Submitting form...");

    // Submit the form - use page.evaluate to find and click the submit button
    const submitClicked = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('div[role="button"], button, span')
      );
      const submitBtn = buttons.find(
        (btn) =>
          (btn as HTMLElement).innerText.includes("Odeslat") ||
          (btn as HTMLElement).innerText.includes("Submit")
      );
      if (submitBtn) {
        (submitBtn as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (submitClicked) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("✅ Form submitted.");
    } else {
      console.warn("⚠️ Could not find submit button.");
    }

    console.log("📊 Looking for 'View results' link...");

    // Get the viewscore URL from the page
    const viewScoreUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const viewResultsLink = links.find(
        (link) =>
          link.innerText.includes("Zobrazit skóre") ||
          link.innerText.includes("View score") ||
          link.href.includes("viewscore")
      );
      return viewResultsLink ? viewResultsLink.href : null;
    });

    if (viewScoreUrl) {
      console.log(`✅ Found viewscore URL: ${viewScoreUrl}`);
      await page.goto(viewScoreUrl, { waitUntil: "networkidle2" });
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("✅ Navigated to results page.");
    } else {
      console.warn("⚠️ Could not find 'View score' link.");
    }

    console.log("🔍 Extracting results with correct/incorrect answers...");

    // Debug: Save the full HTML to see what we're working with
    if (
      process.env.SCRAPER_DEBUG === "true" ||
      process.env.HEADLESS === "false"
    ) {
      const html = await page.content();
      const debugDir = path.resolve("debug");
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir);
      fs.writeFileSync(path.join(debugDir, "results-page.html"), html, "utf-8");
      console.log("🪪 Saved results page HTML to ./debug/results-page.html");
    }

    const questions = (await page.evaluate(() => {
      const result: any[] = [];

      // Google Forms question items in results view - try multiple selectors
      let rawBlocks = Array.from(
        document.querySelectorAll(
          '.freebirdFormviewerViewItemsItemItem, div[role="listitem"], div.lVfwAe'
        )
      );

      console.log(`Found ${rawBlocks.length} blocks with initial selectors`);

      // If no blocks found, try broader selectors
      if (rawBlocks.length === 0) {
        rawBlocks = Array.from(
          document.querySelectorAll(
            "[data-params], .freebirdFormviewerViewItemsItem, .Qr7Oae"
          )
        );
        console.log(`Found ${rawBlocks.length} blocks with fallback selectors`);
      }

      // Filter out nested blocks
      const questionBlocks = rawBlocks.filter((b) => {
        return !rawBlocks.some((other) => other !== b && other.contains(b));
      });

      console.log(
        `After filtering nested: ${questionBlocks.length} question blocks`
      );

      function splitAndPush(target: string[], raw: string) {
        raw
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s) => target.push(s));
      }

      questionBlocks.forEach((block, index) => {
        console.log(`Processing block ${index + 1}/${questionBlocks.length}`);

        let questionText = "";
        let questionType: string = "unknown";
        let options: any[] = [];
        let imageUrl: string | null = null;
        let correctAnswers: string[] = [];

        // common selectors for the question text
        const qSelectors = [
          ".freebirdFormviewerViewItemsItemItemTitle",
          "div.M7eMe",
          "div.Qr7Oae",
          '[role="heading"]',
          "h3",
          "h2",
        ];

        for (const sel of qSelectors) {
          const el = block.querySelector(sel);
          if (el && (el as HTMLElement).innerText.trim()) {
            questionText = (el as HTMLElement).innerText.trim();
            console.log(
              `Found question text: "${questionText.substring(0, 50)}..."`
            );
            break;
          }
        }

        if (!questionText) {
          console.log(`Block ${index + 1}: No question text found`);
        }

        // image (if any)
        const img = block.querySelector("img");
        if (img) imageUrl = (img as HTMLImageElement).src || null;

        // Extract options with correct/incorrect status
        // Look for option containers with role="listitem"
        const optionContainers = Array.from(
          block.querySelectorAll('div[role="listitem"][jsname="MPu53c"]')
        );

        if (optionContainers.length) {
          console.log(
            `Block ${index + 1}: Found ${
              optionContainers.length
            } option containers`
          );

          optionContainers.forEach((container) => {
            // Get text from the option
            const textEl = container.querySelector(".aDTYNe");
            const text = (textEl as HTMLElement)?.innerText?.trim() || "";
            if (!text) return;

            console.log(`  Option text: "${text}"`);

            let isCorrect: boolean | undefined = undefined;

            // Look for the H6Scae div which contains the aria-label for correct/incorrect
            const indicatorDiv = container.querySelector(".H6Scae[aria-label]");

            if (indicatorDiv) {
              const ariaLabel = indicatorDiv.getAttribute("aria-label");
              console.log(`    aria-label: "${ariaLabel}"`);

              if (ariaLabel === "Správně") {
                isCorrect = true;
                console.log("    -> CORRECT");
              } else if (ariaLabel === "Nesprávně") {
                isCorrect = false;
                console.log("    -> INCORRECT");
              }
            } else {
              console.log("    No indicator div found");
            }

            options.push({ text, isCorrect });
            if (isCorrect === true) {
              correctAnswers.push(text);
            }
          });
        }

        // If no options found with the above method, try role="option"
        if (!options.length) {
          const roleOptions = Array.from(
            block.querySelectorAll('[role="option"]')
          );
          roleOptions.forEach((opt) => {
            const text = (opt as HTMLElement).innerText?.trim() || "";
            if (text) {
              options.push({ text, isCorrect: undefined });
            }
          });
        }

        // Fallback to original extraction if still no options
        if (!options.length) {
          const containers = Array.from(
            block.querySelectorAll(
              ".freebirdFormviewerViewItemsItemChoice, .freebirdFormviewerViewItemsItemItemList, div.Y6Myld"
            )
          );
          containers.forEach((c) => {
            const text = (c as HTMLElement).innerText?.trim() || "";
            if (text) {
              options.push({ text, isCorrect: undefined });
            }
          });
        }

        if (options.length) questionType = "multiple_choice";
        else if (block.querySelector("textarea")) questionType = "paragraph";
        else if (
          block.querySelector(
            'input[type="text"], input[type="email"], input[type="number"]'
          )
        )
          questionType = "short_answer";
        else questionType = "unknown";

        result.push({
          question: questionText,
          type: questionType,
          options,
          image_url: imageUrl,
          correctAnswers:
            correctAnswers.length > 0 ? correctAnswers : undefined,
        });
      });

      return result;
    })) as Question[];

    const outPath = path.resolve(outputFile);
    fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), "utf-8");

    console.log(`✅ Scraped ${questions.length} questions.`);
    console.log(`💾 Saved to ${outPath}`);

    return questions;
  } finally {
    await browser.close();
  }
}

// If run directly, execute an example scrape using the old URL list from the JS file.
if (require.main === module) {
  (async () => {
    try {
      const concurrency = 5;
      for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const batchPromises = batch.map((url, idx) => {
          const id = url.split("/")[3] || `${i + idx}`;
          const out = `./src/form/form_data_${id}.json`;
          return scrapeGoogleForm(url, out);
        });
        await Promise.all(batchPromises);
        console.log(
          `Completed ${Math.min(i + concurrency, urls.length)}/${
            urls.length
          } scrapes.`
        );
      }

      console.log("All scrapes completed successfully.");
    } catch (err) {
      console.error("Some scrapes failed:", err);
      process.exitCode = 1;
    }
  })();
}
