require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const { spawn } = require('child_process');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ollama model name (adjust if you named your model differently)
const OLLAMA_MODEL = "llama-3.2";

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// Log environment info
console.log("========================================");
console.log("PORT:", PORT);
console.log("Using Ollama model:", OLLAMA_MODEL);
console.log("========================================");

// Optional ping
app.get('/ping', (req, res) => {
  res.json({ message: 'pong', time: new Date().toISOString() });
});

// Multer for PDF upload
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to parse PDF with Python + pdfplumber
function parsePdfWithPdfplumber(pdfBuffer) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', ['parse_pdf.py']);

    let stdoutData = '';
    let stderrData = '';

    py.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    py.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdoutData);
          resolve(result);
        } catch (jsonErr) {
          reject(jsonErr);
        }
      } else {
        reject(new Error(`Python script exited with code ${code}\n${stderrData}`));
      }
    });

    // Send the PDF buffer to Python via stdin
    py.stdin.write(pdfBuffer);
    py.stdin.end();
  });
}

// Helper function to call Ollama
async function callOllama(prompt) {
  /*
    Adjust the URL/endpoint according to your Ollama setup.
    Default is usually http://localhost:11411/generate or /complete.

    For Ollama CLI references:
      POST /generate  or  POST /api/generate

    The response often contains { "completion": "...the generated text..." }
  */

  try {
    const response = await axios.post(
      'http://localhost:11411/generate', // or your custom Ollama endpoint
      {
        model: OLLAMA_MODEL,
        prompt
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Depending on Ollama version, response.data might look like:
    // { "model": "...", "prompt": "...", "completion": "Full generated text" }
    // Adjust if necessary.
    return response.data.completion;
  } catch (error) {
    console.error('Error calling Ollama:', error.message);
    throw error;
  }
}

// Single-step endpoint
app.post('/generate-report-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // 1) Extract text (and tables) from PDF via pdfplumber (Python script)
    let pdfText = '';
    let pdfTables = [];
    try {
      const result = await parsePdfWithPdfplumber(req.file.buffer);
      pdfText = result.text || '';
      pdfTables = result.tables || [];
    } catch (parseError) {
      console.error('Error parsing PDF with pdfplumber (Python):', parseError);
      pdfText = '';
    }

    console.log("===== EXTRACTED TEXT =====");
    console.log(pdfText);
    console.log("===== EXTRACTED TABLES =====");
    console.log(JSON.stringify(pdfTables, null, 2));

    // 2) Generate first draft with Ollama
    const draftPrompt = `
You are a specialist doctor writing a medical report for another specialist doctor taking over the patient.
Generate a summary of your actions in a form of a medical report based on this log:

Text from PDF:
${pdfText}

Don't just return a list of actions but rather write a coherent text. Use formal, clinical language.
Be concise, include all relevant information. Do not add information not present in the log.
Don't write any sentences that are not necessary to transmit medical information.
Don't keep the exact dates and times, unless they are relevant, focus rather on description of the applied treatment.
`;

    console.log("===== DRAFT PROMPT =====");
    console.log(draftPrompt);

    const draftReport = await callOllama(draftPrompt);

    console.log("===== DRAFT REPORT =====");
    console.log(draftReport);

    // 3) Verify/correct the draft with Ollama
    const verifyPrompt = `
Check if the attached log and the following report are consistent. 
Correct any inconsistencies.
In particular make sure that the report does not add any information not present in the log.
Improve text to make it possibly concise and formal.
Skip exact dates and times, unless they are relevant.
Try to shorten the sentences and eliminate sentences that are not necessary to transmit medical information.
Only one paragraph should result from the verification.
Return only the verified report, without extra commentary.

Log Text:
${pdfText}

Draft Report:
${draftReport}
`;

    console.log("===== VERIFY PROMPT =====");
    console.log(verifyPrompt);

    const verifiedReport = await callOllama(verifyPrompt);

    console.log("===== VERIFIED REPORT =====");
    console.log(verifiedReport);

    // 4) Generate PDF from the verified text
    const doc = new PDFDocument();
    const tempFilePath = path.join(__dirname, 'temp_report.pdf');
    const writeStream = fs.createWriteStream(tempFilePath);

    doc.pipe(writeStream);

    doc.fontSize(16).text('Medical Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(verifiedReport, { align: 'left' });
    doc.end();

    // Once PDF is written, send it
    writeStream.on('finish', () => {
      res.sendFile(tempFilePath, (err) => {
        // Clean up temporary file
        if (!err) {
          fs.unlinkSync(tempFilePath);
        } else {
          console.error('Error sending PDF file:', err);
        }
      });
    });

  } catch (error) {
    console.error('Error in /generate-report-pdf:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to generate final PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
