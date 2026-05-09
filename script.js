pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const fillerWords = [
  "the", "of", "and", "if", "as", "is", "was", "are", "be", "been",
  "to", "in", "on", "for", "with", "by", "from", "this", "that", "it",
  "or", "an", "a", "so", "but", "then", "than", "also", "very",
  "good", "okay", "ok", "test", "testing", "sample", "dummy", "done",
  "fine", "yes", "no", "maybe", "check", "checked"
];

const automotiveTerms = [
  "engine", "motor", "powertrain", "transmission", "gearbox", "transfer",
  "transfer case", "differential", "diff", "propeller shaft", "drive shaft",
  "axle", "bearing", "wheel bearing", "brake", "caliper", "disc", "rotor",
  "pad", "abs", "steering", "suspension", "sensor", "ecu", "ecm", "battery",
  "alternator", "wiring", "connector", "harness", "fuel", "injector", "turbo",
  "coolant", "radiator", "oil", "tire", "wheel", "chassis", "compressor",
  "a/c", "ac", "headlight", "noise", "sound", "squeak", "rattle", "knock",
  "click", "grinding", "humming", "buzz", "whine", "vibration", "shake",
  "hesitation", "jerk", "slip", "leak", "warning", "lamp", "dtc", "code",
  "fault", "abnormal", "intermittent", "continuous", "drive", "driving",
  "accelerate", "brake", "pedal", "idle", "turn", "left", "right", "straight",
  "reverse", "forward", "shift", "gear", "speed", "rpm", "temperature",
  "warm", "hot", "cold", "load", "towing", "road", "highway", "paved",
  "diagnosis", "inspection", "road test", "test drive", "confirmed", "found",
  "measured", "scan", "scanner", "removed", "result"
];

const repairWords = [
  "replace", "replaced", "replacement", "changed", "renewed", "installed",
  "repair", "repaired", "fixed", "corrected", "adjusted", "cleaned",
  "resolved", "solved", "confirmed", "verified", "normal", "no abnormality",
  "not happening", "not occurring", "passed road test", "improved"
];

const requestWords = [
  "tmc", "request", "requested", "we request", "investigate", "investigation",
  "technical support", "please advise", "please confirm", "root cause",
  "countermeasure", "solution", "approval", "review", "ti", "trf", "tsb",
  "ftr", "technical information", "service bulletin", "feedback"
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function addFeedback(list, message) {
  if (!list.includes(message)) list.push(message);
}

function containsAny(text, terms) {
  const clean = normalize(text);
  return terms.some(term => clean.includes(normalize(term)));
}

function wordCount(text) {
  return normalize(text).split(" ").filter(Boolean).length;
}

function usefulWords(text) {
  return normalize(text)
    .split(" ")
    .filter(word => word && !fillerWords.includes(word));
}

function isFillerText(text) {
  const words = usefulWords(text);
  if (words.length === 0) return true;

  const uniqueRatio = new Set(words).size / words.length;
  return words.length > 6 && uniqueRatio < 0.35;
}

function cleanPdfText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .trim();
}

function findHeadingIndex(text, headingOptions, startFrom = 0) {
  const lower = text.toLowerCase();

  for (const heading of headingOptions) {
    const index = lower.indexOf(heading.toLowerCase(), startFrom);
    if (index !== -1) return index;
  }

  return -1;
}

function extractFlexibleSection(text, startHeadings, endHeadings) {
  const cleanText = cleanPdfText(text);
  const startIndex = findHeadingIndex(cleanText, startHeadings);

  if (startIndex === -1) return "";

  let contentStart = startIndex;

  for (const heading of startHeadings) {
    const possible = cleanText.toLowerCase().indexOf(heading.toLowerCase(), startIndex);
    if (possible === startIndex) {
      contentStart = startIndex + heading.length;
      break;
    }
  }

  let nearestEnd = -1;

  for (const endHeading of endHeadings) {
    const endIndex = cleanText.toLowerCase().indexOf(endHeading.toLowerCase(), contentStart);
    if (endIndex !== -1 && (nearestEnd === -1 || endIndex < nearestEnd)) {
      nearestEnd = endIndex;
    }
  }

  if (nearestEnd === -1) {
    return cleanText.slice(contentStart).trim();
  }

  return cleanText.slice(contentStart, nearestEnd).trim();
}

function extractIFTRSections(text) {
  const cleanText = cleanPdfText(text);

  return {
    subject: extractFlexibleSection(cleanText, ["Subject"], ["Company"]),
    vin: extractFlexibleSection(cleanText, ["VIN"], ["Model"]),
    model: extractFlexibleSection(cleanText, ["Model "], ["Model Code"]),
    modelCode: extractFlexibleSection(cleanText, ["Model Code"], ["Engine Type"]),
    engineType: extractFlexibleSection(cleanText, ["Engine Type"], ["Engine No."]),
    transmissionType: extractFlexibleSection(cleanText, ["T/M Type"], ["Model Year"]),

    background: extractFlexibleSection(
      cleanText,
      [
        "1. Phenomenon and Background of how this phenomenon was noticed",
        "Phenomenon and Background",
        "Background of how this phenomenon was noticed"
      ],
      [
        "2. Detailed condition",
        "Detailed condition"
      ]
    ),

    usageCondition: extractFlexibleSection(
      cleanText,
      [
        "2-3. Usage condition",
        "Usage condition"
      ],
      [
        "3. Risk factors",
        "Risk factors"
      ]
    ),

    riskFactors: extractFlexibleSection(
      cleanText,
      [
        "3. Risk factors",
        "Risk factors"
      ],
      [
        "DLR/DIST Confirmation Results",
        "Confirmation Results"
      ]
    ),

    reproduce: extractFlexibleSection(
      cleanText,
      [
        "1. How to reproduce the phenomenon & Result",
        "How to reproduce the phenomenon",
        "How to reproduce"
      ],
      [
        "2. Occurring condition when reproducing",
        "Occurring condition when reproducing"
      ]
    ),

    reproduceCondition: extractFlexibleSection(
      cleanText,
      [
        "2. Occurring condition when reproducing it",
        "Occurring condition when reproducing"
      ],
      [
        "3. Detailed diagnosis contents & Result",
        "Detailed diagnosis contents",
        "Detailed diagnosis"
      ]
    ),

    diagnosis: extractFlexibleSection(
      cleanText,
      [
        "3. Detailed diagnosis contents & Result",
        "Detailed diagnosis contents & Result",
        "Detailed diagnosis contents",
        "Detailed diagnosis"
      ],
      [
        "4. Repair history / Maintenance record",
        "Repair history / Maintenance record",
        "Repair history"
      ]
    ),

    repairHistory: extractFlexibleSection(
      cleanText,
      [
        "4. Repair history / Maintenance record",
        "Repair history / Maintenance record",
        "Repair history"
      ],
      [
        "Attachment to support DLR/DIST confirmation",
        "Probable Cause estimated by DLR/DIST"
      ]
    ),

    probableCause: extractFlexibleSection(
      cleanText,
      [
        "Probable Cause estimated by DLR/DIST",
        "Probable Cause"
      ],
      [
        "Attachment to support DLR/DIST estimation",
        "Correction"
      ]
    ),

    correction: extractFlexibleSection(
      cleanText,
      ["Correction"],
      ["Repair Result"]
    ),

    repairResult: extractFlexibleSection(
      cleanText,
      ["Repair Result"],
      ["Hyper Link", "Requests / Comments"]
    ),

    requestComment: extractFlexibleSection(
      cleanText,
      [
        "2. Request/Comment",
        "Request/Comment",
        "Request / Comment"
      ],
      [
        "Potential high number",
        "Attachment to support Requests",
        "Warranty / Problem Trend"
      ]
    ),

    warrantyTrend: extractFlexibleSection(
      cleanText,
      [
        "Warranty / Problem Trend in your market",
        "Warranty / Problem Trend"
      ],
      [
        "Attachment to support Warranty",
        "Other Affected Vehicles"
      ]
    )
  };
}

const NA_VALUES = [
  "na",
  "n/a",
  "n\\a",
  "nil",
  "not applicable"
];

const CRITICAL_SECTIONS = [
  "diagnosis",
  "repairHistory",
  "correction",
  "repairResult",
  "requestComment"
];

function normalizeForScoring(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isBlank(text) {
  return normalizeForScoring(text).length === 0;
}

function isNAOnly(text) {
  const clean = normalizeForScoring(text);
  return NA_VALUES.includes(clean);
}

function isWeakOneLine(text) {
  const words = normalizeForScoring(text)
    .split(" ")
    .filter(Boolean);

  return words.length > 0 && words.length <= 4;
}

function hasUsefulContent(text) {
  const words = normalizeForScoring(text)
    .split(" ")
    .filter(Boolean);

  return words.length >= 5;
}

function score1MarkSection(text, critical = false) {
  if (isBlank(text)) return 0;

  if (isNAOnly(text)) {
    return critical ? 0 : 1;
  }

  if (isWeakOneLine(text)) {
    return 0;
  }

  return 1;
}

function score2MarkSection(text, critical = false) {
  if (isBlank(text)) return 0;

  if (isNAOnly(text)) {
    return critical ? 0 : 1;
  }

  if (isWeakOneLine(text)) {
    return 1;
  }

  if (hasUsefulContent(text)) {
    return 2;
  }

  return 0;
}

function score3MarkSection(text, critical = false) {
  if (isBlank(text)) return 0;

  if (isNAOnly(text)) {
    return critical ? 0 : 1;
  }

  if (isWeakOneLine(text)) {
    return 1;
  }

  const words = normalizeForScoring(text)
    .split(" ")
    .filter(Boolean);

  if (words.length >= 9 && words.length < 20) {
    return 2;
  }

  if (words.length >= 20) {
    return 3;
  }

  return 0;
}

function hasSelectedCheckboxNear(text, keyword) {
  const clean = String(text || "");
  const regex = new RegExp("\\[\\*\\][^\\n]{0,80}" + keyword, "i");
  return regex.test(clean);
}

function hasExplanationAfterKeyword(text, keyword) {
  const clean = normalizeForScoring(text);
  const index = clean.indexOf(keyword.toLowerCase());

  if (index === -1) return false;

  const after = clean.slice(index + keyword.length).trim();
  return after.split(" ").filter(Boolean).length >= 5;
}

function checkCheckboxIssues(fullText) {
  const issues = [];

  if (hasSelectedCheckboxNear(fullText, "others") && !hasExplanationAfterKeyword(fullText, "others")) {
    issues.push("Others checkbox is selected but explanation is missing.");
  }

  if (hasSelectedCheckboxNear(fullText, "non-reproducible") && !hasExplanationAfterKeyword(fullText, "non-reproducible")) {
    issues.push("Non-Reproducible is selected but reason is missing.");
  }

  return issues;
}

function extractDates(fullText) {
  const text = String(fullText || "");

  const dateRegex = /(\d{1,2})[\/\- ]([A-Za-z]{3,}|\d{1,2})[\/\- ](\d{4})/g;
  const matches = [...text.matchAll(dateRegex)].map(m => m[0]);

  return matches;
}

function checkDateLogic(fullText) {
  const issues = [];
  const dates = extractDates(fullText);

  if (dates.length < 3) {
    issues.push("Some important dates may be missing or unreadable.");
  }

  return issues;
}

function detectOtherAffectedVehicles(fullText) {
  const clean = normalizeForScoring(fullText);

  if (!clean.includes("other affected vehicles")) return 0;

  if (
    clean.includes("vin") ||
    clean.includes("case") ||
    clean.includes("same concern") ||
    clean.includes("similar concern") ||
    clean.includes("other vehicle")
  ) {
    return 2;
  }

  return 1;
}

function buildRuleBasedWarnings(fullText, scores) {
  const warnings = [];

  checkCheckboxIssues(fullText).forEach(x => warnings.push(x));
  checkDateLogic(fullText).forEach(x => warnings.push(x));

  if (scores.diagnosis === 0) warnings.push("Diagnosis section is missing or not technically useful.");
  if (scores.correction === 0) warnings.push("Correction / Repair Details is missing or too weak.");
  if (scores.repairResult === 0) warnings.push("Repair Result is missing or too weak.");
  if (scores.repairHistory === 0) warnings.push("Service / Repair History is missing or too weak.");
  if (scores.requestComment === 0) warnings.push("Request / Comments to TMC is missing or too weak.");

  return warnings;
}

function evaluateIFTRScore(fullText) {
  const s = extractIFTRSections(fullText);
  console.log("EXTRACTED SECTIONS:", s);
  const scores = {
    basicInfo: 1, // can improve later with date checks

    background: score2MarkSection(s.background),

    vehicleCondition: score2MarkSection(s.usageCondition),

    operatingCondition: score2MarkSection(s.usageCondition),

    frequency: score1MarkSection(s.background),

    environment: score2MarkSection(s.riskFactors),

    generalUsage: score1MarkSection(s.usageCondition),

    reproduce: score2MarkSection(s.reproduce),

    reproduceCondition: score3MarkSection(s.reproduceCondition),

    diagnosis: score3MarkSection(s.diagnosis, true),

    attachments: 3, // can improve later with actual attachment check

    repairHistory: score1MarkSection(s.repairHistory, true),

    correction: score1MarkSection(s.correction, true),

    repairResult: score1MarkSection(s.repairResult, true),

    marketImpact: fullText.toLowerCase().includes("warranty") || fullText.toLowerCase().includes("problem trend") ? 1 : 0,

    requestComment: score1MarkSection(s.requestComment, true),

   otherVehicles: detectOtherAffectedVehicles(fullText),

    partsInfo: score1MarkSection(s.correction)
  };
let penalty = 0;

if (scores.diagnosis === 0) penalty += 1;
if (scores.repairHistory === 0) penalty += 1;
if (scores.correction === 0) penalty += 1;
if (scores.repairResult === 0) penalty += 1;
if (scores.requestComment === 0) penalty += 1;


 const rawTotal =
  Object.values(scores).reduce((sum, value) => sum + value, 0);

const total = Math.max(0, rawTotal - penalty);
  let status = "Poor";

  if (total >= 25) status = "Excellent";
  else if (total >= 20) status = "Good";
  else if (total >= 10) status = "Fair";
  const warnings = buildRuleBasedWarnings(fullText, scores);
 return {
  scores,
  total,
  status,
  warnings
};
}

function validateStrictSection(sectionName, value, errors, warnings) {
  if (!value || wordCount(value) < 3) {
    addFeedback(errors, "Section: " + sectionName + " → Field is empty or too short.");
    return;
  }

  if (isFillerText(value)) {
    addFeedback(errors, "Section: " + sectionName + " → Please provide relevant information.");
    return;
  }

  const matches = automotiveTerms.filter(term =>
    normalize(value).includes(normalize(term))
  );

  if (matches.length <= 3) {
    addFeedback(errors, "Section: " + sectionName + " → Please provide relevant information.");
  } else if (matches.length <= 7) {
    addFeedback(warnings, "Section: " + sectionName + " → Better if more relevant information is provided.");
  }
}

function validateMildSection(sectionName, value, warnings, allowNA = false) {
  const clean = normalize(value);

  if (!value) {
    addFeedback(warnings, "Section: " + sectionName + " is left empty, please review.");
    return;
  }

  if (allowNA && ["na", "n/a", "n.a", "n.a.", "not applicable"].includes(clean)) {
    return;
  }

  if (isFillerText(value)) {
    addFeedback(warnings, "Section: " + sectionName + " lacks relevance.");
  }
}

function validateRepairSection(sectionName, value, warnings) {
  if (!value) {
    addFeedback(warnings, "Section: " + sectionName + " is left empty, please review.");
    return;
  }

  if (isFillerText(value)) {
    addFeedback(warnings, "Section: " + sectionName + " lacks relevance.");
    return;
  }

  if (!containsAny(value, repairWords)) {
    addFeedback(warnings, "Section: " + sectionName + " lacks repair/result confirmation.");
  }
}

function validateRequestComment(value, warnings) {
  if (!value) {
    addFeedback(warnings, "Section: Request / Comment is left empty, please review.");
    return;
  }

  if (isFillerText(value)) {
    addFeedback(warnings, "Section: Request / Comment lacks relevance.");
    return;
  }

  if (!containsAny(value, requestWords)) {
    addFeedback(warnings, "Section: Request / Comment should include request/TMC/technical communication details.");
  }
}

function validatePDFText(text) {
  const errors = [];
  const warnings = [];

  const sections = extractIFTRSections(text);

  if (!sections.subject) addFeedback(errors, "Section: Subject is missing.");
  if (!sections.vin) addFeedback(errors, "Section: VIN is missing.");
  if (!sections.model) addFeedback(errors, "Section: Model is missing.");
  if (!sections.modelCode) addFeedback(errors, "Section: Model Code is missing.");
  if (!sections.engineType) addFeedback(errors, "Section: Engine Type is missing.");
  if (!sections.transmissionType) addFeedback(errors, "Section: Transmission Type is missing.");

  validateStrictSection("Background Phenomenon", sections.background, errors, warnings);
  validateStrictSection("Usage Condition", sections.usageCondition, errors, warnings);
  validateStrictSection("How to Reproduce", sections.reproduce, errors, warnings);
  validateStrictSection("Detailed Diagnosis", sections.diagnosis, errors, warnings);

  validateMildSection("Risk Factors", sections.riskFactors, warnings, true);
  validateRepairSection("Correction", sections.correction, warnings);
  validateRepairSection("Repair Result", sections.repairResult, warnings);
  validateRequestComment(sections.requestComment, warnings);
  validateMildSection("Warranty / Problem Trend", sections.warrantyTrend, warnings);

  if (
    sections.diagnosis &&
    !containsAny(sections.diagnosis, ["step", "first", "then", "after", "finally", "1.", "2.", "3."])
  ) {
    addFeedback(warnings, "Section: Detailed Diagnosis → Better to write diagnosis in chronological order.");
  }

  if (sections.diagnosis && !/\d/.test(sections.diagnosis)) {
    addFeedback(warnings, "Section: Detailed Diagnosis → Better to include measurement values such as speed, RPM, temperature, voltage, or pressure.");
  }

  return { errors, warnings, sections };
}

async function sendPDFTextToBackend(fullText) {
  const response = await fetch("http://localhost:3000/receive-pdf-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pdfText: fullText
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.aiResult || data.message || "Backend error");
  }

  return data;
}
async function extractTextWithOCR(pdf) {
  let ocrText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    // Higher scale = clearer image for OCR
    const viewport = page.getViewport({ scale: 4 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // White background helps OCR
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Improve contrast / convert to black & white
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray =
        0.299 * data[i] +
        0.587 * data[i + 1] +
        0.114 * data[i + 2];

      const value = gray < 170 ? 0 : 255;

      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    context.putImageData(imageData, 0, 0);

    console.log("Running OCR on page " + pageNumber);

    const result = await Tesseract.recognize(canvas, "eng", {
      logger: info => {
        console.log(info);
      }
    });

    ocrText += "\n\n--- OCR PAGE " + pageNumber + " ---\n";
    ocrText += result.data.text;
  }

  return ocrText;
}

async function readAndValidatePDF() {
  const fileInput = document.getElementById("pdfFile");
  const resultBox = document.getElementById("resultBox");
  const statusText = document.getElementById("statusText");
  const feedbackText = document.getElementById("feedbackText");
  const extractedTextBox = document.getElementById("extractedText");

  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a PDF file first.");
    return;
  }

  extractedTextBox.textContent = "Running backend OCR + local AI review...";

  try {
    const ocrData = await sendPDFFileToBackendForOCR(file);
    const scoring = evaluateIFTRScore(ocrData.ocrText);
    
console.log("FINAL SCORE:", scoring);

    console.log("OCR DATA FROM BACKEND:", ocrData);

    extractedTextBox.textContent = ocrData.ocrText || "No OCR text returned.";

    resultBox.style.display = "block";
    resultBox.className = "result warning";
    statusText.textContent = "OCR + AI Review Completed";

    feedbackText.innerHTML = `
  <h3>IFTR Rule-Based Review</h3>


<h3>Warnings / Rule Checks</h3>
<ul>
  ${
    
    scoring.warnings.length
      ? scoring.warnings.map(w => `<li>${w}</li>`).join("")
      : "<li>None.</li>"
  }
</ul>
  <p><strong>Final Status:</strong> ${scoring.status}</p>
  <p><strong>Total Score:</strong> ${scoring.total} / 30</p>

  <h3>Category Scores</h3>
  <pre>${JSON.stringify(scoring.scores, null, 2)}</pre>

  <h3>OCR Summary</h3>
  <p><strong>Extracted text length:</strong> ${(ocrData.ocrText || "").length}</p>
`;

  } catch (error) {
    console.error(error);

    resultBox.style.display = "block";
    resultBox.className = "result rejected";
    statusText.textContent = "OCR / AI Failed";
    feedbackText.innerHTML = `<p>${error.message}</p>`;
  }
}

async function testBackendConnection() {
  try {
    const response = await fetch("http://localhost:3000/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Hello from frontend"
      })
    });

    const data = await response.json();

    alert(data.message);
    console.log(data);
  } catch (error) {
    alert("Backend connection failed.");
    console.error(error);
  }
}
async function sendPDFFileToBackendForOCR(file) {
  const formData = new FormData();
  formData.append("pdfFile", file);

  const response = await fetch("https://iftr-validator.onrender.com/ocr-pdf", {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "OCR failed");
  }

  return data;
}


