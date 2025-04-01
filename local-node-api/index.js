// index.js - Express server backend

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (adjust if needed)
app.use(cors({
    origin: '*'
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from "public" folder
app.use(express.static('public'));

// Quick log to confirm environment setup
console.log("========================================");
console.log("Starting Express server with the following config:");
console.log("PORT:", PORT);
console.log("OpenAI Key present?", process.env.OPENAI_API_KEY ? "Yes" : "No");
console.log("========================================");

// Endpoint: Simple sanity check
app.get('/ping', (req, res) => {
    console.log("Received /ping request");
    res.json({ message: 'pong', time: new Date().toISOString() });
});

// Set up file upload using multer
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // limit PDF size to 10MB
});

// 1) POST /draft
//    - Accepts PDF, extracts text, calls ChatGPT for first version of the report
app.post('/draft', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // Extract text from PDF
    const dataBuffer = req.file.buffer;
    const pdfData = await pdfParse(dataBuffer);
    const logText = pdfData.text;

    // Call ChatGPT to produce the first draft
    const initialPrompt = `
Generate a summary of doctor actions for a medical report based on this log:
${logText}

Not a list of actions but rather a coherent text. Use formal, clinical language, as if a specialist doctor would write for another specialist doctor taking over the patient. Be concise, but make sure to include all information about actions taken by the doctor.
    `;

    const draftResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: initialPrompt },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const draftText = draftResponse.data.choices[0].message.content;

    // Return draft text and also include the extracted log in the response
    // so we can pass it along to the next step
    res.json({
      draftReport: draftText,
      pdfLog: logText
    });

  } catch (error) {
    console.error('Error generating first draft:', error);
    res.status(500).json({ error: 'Failed to generate first draft' });
  }
});

// 2) POST /verify
//    - Accepts original PDF log text + the draft report, asks ChatGPT to verify/correct
app.post('/verify', async (req, res) => {
  try {
    const { pdfLog, draftReport } = req.body;
    if (!pdfLog || !draftReport) {
      return res.status(400).json({ error: 'Missing pdfLog or draftReport in request body.' });
    }

    // Build the prompt for verification
    const verifyPrompt = `
Check if the attached log and following report are consistent. If not, correct the report.
Log:
${pdfLog}

Report:
${draftReport}
`;

    const verifyResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: verifyPrompt },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const verifiedReport = verifyResponse.data.choices[0].message.content;

    res.json({
      verifiedReport
    });
  } catch (error) {
    console.error('Error verifying/correcting report:', error);
    res.status(500).json({ error: 'Failed to verify/correct the report' });
  }
});

// 3) POST /generate-pdf
//    - Accepts final verified text. Generates a PDF and returns it for download
app.post('/generate-pdf', async (req, res) => {
  try {
    const { verifiedReport } = req.body;
    if (!verifiedReport) {
      return res.status(400).json({ error: 'Missing verifiedReport in request body.' });
    }

    // Optionally: ask ChatGPT to "generate a PDF" in text form.
    // (But usually we just build the PDF ourselves.)
    // For example:
    // await axios.post('...') ...
    // We'll skip that and just proceed.

    // Create PDF from the verified text
    const doc = new PDFDocument();

    // We'll create a temporary file path
    const tempFilePath = path.join(__dirname, 'temp_report.pdf');
    const writeStream = fs.createWriteStream(tempFilePath);

    doc.pipe(writeStream);

    doc.fontSize(14).text('Medical Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(11).text(verifiedReport, {
      align: 'left'
    });

    doc.end();

    // When the PDF is fully written, send it back
    writeStream.on('finish', () => {
      res.sendFile(tempFilePath, (err) => {
        if (!err) {
          // Optionally delete temp file after sending
          fs.unlinkSync(tempFilePath);
        }
      });
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
