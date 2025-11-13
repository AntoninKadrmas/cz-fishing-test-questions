import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fishingTestUrl } from "./urls";

// The interface for the final JSON object for each question
export interface Question {
  question: string;
  type: "multiple_choice";
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  image_url: string | null;
  correctAnswers: string[];
  url: string;
}

/**
 * This function will scrape the fishing test questions from the given URL.
 * @param url The URL of the page with the list of questions.
 * @param outputFile The name of the file to save the data to.
 */
export async function scrapeFishingTest(
  url: string,
  outputFile = "fishing_test_data.json"
): Promise<Question[]> {
  const browser = await puppeteer.launch({ headless: false }); // Use headless: false to see the browser
  const page = await browser.newPage();

  try {
    // Navigate to the initial page with all the question links
    await page.goto(url, { waitUntil: "networkidle2" });

    console.log("Extracting question links...");

    // Get all the links to the individual question pages
    const questionLinks = await page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href^="?otazka="]')
      );
      // We need to construct the full URL
      return links.map((link) => link.href);
    });

    console.log(`Found ${questionLinks.length} question links.`);

    const questions: Question[] = [];

    // Helper function to scrape a single question
    async function scrapeQuestion(link: string): Promise<Question> {
      const questionPage = await browser.newPage();
      try {
        await questionPage.goto(link, { waitUntil: "networkidle2" });

        console.log(`Scraping question from: ${link}`);

        // Click the button to show the correct answer
        await questionPage.click("#btn-zobraz_spravnou");

        // Wait for the correct answer to be displayed
        await questionPage.waitForSelector(".otazka_spravne.correct");

        const questionData = await questionPage.evaluate(() => {
          const questionText =
            (document.querySelector(".question-text") as HTMLElement)
              ?.innerText || "";
          const imageUrl =
            (document.querySelector(".image-frame img") as HTMLImageElement)
              ?.src || null;

          const options = Array.from(document.querySelectorAll(".answer")).map(
            (answer) => {
              const text =
                (answer.querySelector("p") as HTMLElement)?.innerText || "";
              const isCorrect = answer.classList.contains("otazka_spravne");
              return { text, isCorrect };
            }
          );

          const correctAnswers = options
            .filter((option) => option.isCorrect)
            .map((option) => option.text);

          return {
            question: questionText,
            type: "multiple_choice",
            options,
            image_url: imageUrl,
            correctAnswers,
          };
        });

        return questionData as Question;
      } finally {
        await questionPage.close();
      }
    }

    // Process links in batches of 5
    const batchSize = 20;
    for (let i = 0; i < questionLinks.length; i += batchSize) {
      const batch = questionLinks.slice(i, i + batchSize);
      const promises = batch.map(async (link) => {
        const questionData = await scrapeQuestion(link);
        return { ...questionData, url: link };
      });
      const batchResults = await Promise.all(promises);
      questions.push(...batchResults);
    }

    // Save the data to a JSON file
    const outPath = path.resolve(outputFile);
    fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), "utf-8");

    console.log(
      `Scraped ${questions.length} questions and saved to ${outPath}`
    );

    return questions;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  (async () => {
    try {
      const concurrency = 5;
      for (let i = 0; i < fishingTestUrl.length; i += concurrency) {
        const batch = fishingTestUrl.slice(i, i + concurrency);
        const batchPromises = batch.map((url, idx) => {
          const id = url.split("?")[1] || `${i + idx}`;
          const out = `./src/etesty/form_data_${id}.json`;
          return scrapeFishingTest(url, out);
        });
        await Promise.all(batchPromises);
        console.log(
          `Completed ${Math.min(i + concurrency, fishingTestUrl.length)}/${
            fishingTestUrl.length
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
