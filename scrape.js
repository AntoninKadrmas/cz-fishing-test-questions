const puppeteer = require("puppeteer");
const fs = require("fs");

async function scrapeGoogleForm(url, outputFile = "form_data.json") {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // Počkej, než se načtou všechny otázky
  await page.waitForTimeout(3000);

  // Scrape Google Form
  const questions = await page.evaluate(() => {
    const result = [];
    const questionBlocks = document.querySelectorAll('div[role="listitem"]');

    questionBlocks.forEach((block) => {
      let questionText = "";
      let questionType = "";
      let options = [];
      let imageUrl = null;

      const qElement =
        block.querySelector("div.M7eMe") || block.querySelector("div.Qr7Oae");
      if (qElement) {
        questionText = qElement.innerText.trim();
      }

      const img = block.querySelector("img");
      if (img) {
        imageUrl = img.src;
      }

      const optionElements = block.querySelectorAll("div.Y6Myld");
      optionElements.forEach((opt) => {
        const text = opt.innerText.trim();
        if (text) options.push(text);
      });

      if (options.length > 0) {
        questionType = "multiple_choice";
      } else if (block.querySelector("textarea")) {
        questionType = "paragraph";
      } else if (block.querySelector("input")) {
        questionType = "short_answer";
      } else {
        questionType = "unknown";
      }

      result.push({
        question: questionText,
        type: questionType,
        options: options,
        image_url: imageUrl,
      });
    });

    return result;
  });

  await browser.close();

  fs.writeFileSync(outputFile, JSON.stringify(questions, null, 4), "utf-8");
  console.log(`✅ Scraped ${questions.length} questions.`);
  console.log(`💾 Saved to ${outputFile}`);
}

// Example usage
const urls = [
  "https://forms.gle/zcmtvvFCJmnZr5bL7",
  "https://forms.gle/eLFXYBqHPDTHZVrt9",
  "https://forms.gle/i46ZK8soU6impPHcA",
  "https://forms.gle/yXWbq9rCx6ry4u93A",
  "https://forms.gle/aqLftYJsvCkn1zaK6",
  "https://forms.gle/FuJRfWDu5aAc27Lk9",
  "https://forms.gle/DmzoP19yn58HXtfS7",
  "https://forms.gle/NM7fHGVxveRbcXULA",
  "https://forms.gle/u8P2Ku8XbZ6BrC6N7",
  "https://forms.gle/Be6tRKYPPyd9DsJz9",
  "https://forms.gle/BvzBtwp5Tv9jnASs9",
  "https://forms.gle/dLFEEn53sVDxE9yk7",
  "https://forms.gle/Nh6CVSR9Uyjabsv48",
  "https://forms.gle/XeTtGXDTz2yABkC16",
  "https://forms.gle/Fo1HGqycvwcicGuA8",
  "https://forms.gle/y2LKPdJzZ3uaH4Lk9",
  "https://forms.gle/fdJfLkq6uwwgKoSo8",
  "https://forms.gle/hk9J9QVk4BX8bPkJA",
  "https://forms.gle/iXUComJCf5wrVTuP6",
  "https://forms.gle/SFxvUbxLFp5QNHxs7",
  "https://forms.gle/UqnQHe1eJxsCrXsj8",
  "https://forms.gle/sy5tE7FhWeP6gZGeA",
  "https://forms.gle/orpT92AyvEkqaKFy7",
  "https://forms.gle/75Pnsi3STTTn3Xfk8",
  "https://forms.gle/PFCZYjwA851Rpog39",
  "https://forms.gle/V3A1Mm7iFwtE2iix5",
  "https://forms.gle/xj254wBN9BB8ged76",
  "https://forms.gle/MJs56QUxUviBBxfh6",
  "https://forms.gle/DuoLBE1rQ3DrWdEJ9",
  "https://forms.gle/GeiEtB34uCemerpF8",
];

scrapeGoogleForm(urls[0]);
