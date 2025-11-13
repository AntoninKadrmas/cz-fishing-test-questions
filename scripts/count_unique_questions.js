#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function normalize(s) {
  if (!s && s !== "") return "";
  return String(s).replace(/\s+/g, " ").trim().toLowerCase();
}

const formsDir = path.join(__dirname, "..", "src", "form");
if (!fs.existsSync(formsDir)) {
  console.error(`Forms directory not found: ${formsDir}`);
  process.exit(1);
}

const files = fs.readdirSync(formsDir).filter((f) => f.endsWith(".json"));
if (!files.length) {
  console.log("No form JSON files found in src/form");
  process.exit(0);
}

let totalQuestions = 0;
const uniqueMap = new Map(); // key -> {count, samples: [{file,question}]}

for (const file of files) {
  const full = path.join(formsDir, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (err) {
    console.error(`Failed to parse ${file}: ${err.message}`);
    continue;
  }

  if (!Array.isArray(data)) continue;

  for (const q of data) {
    totalQuestions++;
    const qText = normalize(q.question || "");
    const opts = Array.isArray(q.options)
      ? q.options.map((o) => normalize(o.text || ""))
      : [];
    // sort answers to make order-insensitive
    const sorted = opts.slice().sort();
    const key = `${qText}||${JSON.stringify(sorted)}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, { count: 0, samples: [{ file, question: qText }] });
    }
    const rec = uniqueMap.get(key);
    rec.count++;
  }
}

const uniqueCount = uniqueMap.size;
const duplicateCount = totalQuestions - uniqueCount;

console.log("Unique questions by (question + answers):", uniqueCount);
console.log("Total questions processed:", totalQuestions);
console.log("Duplicate questions (same question+answers):", duplicateCount);

// Optionally list duplicates (groups with count>1)
const duplicates = Array.from(uniqueMap.entries()).filter(
  ([, v]) => v.count > 1
);
if (duplicates.length) {
  console.log("\nDuplicate groups (count -> example file/question):");
  for (const [, v] of duplicates) {
    const ex = v.samples[0] || {};
    console.log(`  ${v.count} -> ${ex.file} / "${ex.question}"`);
  }
}
