const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const uploadFolder = "D:\\iftr-uploads";

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const upload = multer({
  dest: uploadFolder
});

app.get("/", (req, res) => {
  res.send("IFTR backend is running successfully!");
});

app.post("/ocr-pdf", upload.single("pdfFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No PDF file uploaded."
    });
  }

  const pdfPath = req.file.path;

  console.log("PDF received for OCR:", pdfPath);

  const pythonProcess = spawn("python", [
    path.join(__dirname, "..", "ocr_engine.py"),
    pdfPath
  ]);

  let ocrText = "";
  let errorText = "";

  pythonProcess.stdout.on("data", data => {
    ocrText += data.toString();
  });

  pythonProcess.stderr.on("data", data => {
    errorText += data.toString();
  });

  pythonProcess.on("close", async code => {
    if (code !== 0) {
      return res.status(500).json({
        success: false,
        message: "OCR failed.",
        error: errorText
      });
    }

    console.log("OCR completed.");

    res.json({
  success: true,
  ocrText: ocrText
});
});
});



app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});