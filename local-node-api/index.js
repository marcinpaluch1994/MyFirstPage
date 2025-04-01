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

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// Log environment info
console.log("========================================");
console.log("PORT:", PORT);
console.log("OpenAI Key present?", process.env.OPENAI_API_KEY ? "Yes" : "No");
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
    // Spawn the Python script
    const py = spawn('python', ['parse_pdf.py']);

    // Collect data from stdout
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
        // Script failed
        reject(new Error(`Python script exited with code ${code}\n${stderrData}`));
      }
    });

    // Send the PDF buffer to Python via stdin
    py.stdin.write(pdfBuffer);
    py.stdin.end();
  });
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

      // result has shape: { text: "...", tables: [ [...], [...], ... ] }
      pdfText = result.text || '';
      pdfTables = result.tables || [];
    } catch (parseError) {
      console.error('Error parsing PDF with pdfplumber (Python):', parseError);
      // If parse fails, we can fallback to empty text or return an error
      pdfText = '';
    }

    // Log extracted text + tables for debugging
    console.log("===== EXTRACTED TEXT =====");
    console.log(pdfText);
    console.log("===== EXTRACTED TABLES =====");
    console.log(JSON.stringify(pdfTables, null, 2));

    // 2) Call ChatGPT to get first draft
    const draftPrompt = `
Generate a summary of doctor actions for a medical report based on this log:

Text from PDF:
${pdfText}

Tables from PDF (if relevant):
${JSON.stringify(pdfTables)}

Not a list of actions but rather a coherent text. Use formal, clinical language, as if a specialist doctor would write for another specialist doctor taking over the patient. Be concise, but make sure to include all information about actions taken by the doctor.
`;

    // Log the prompt for debugging
    console.log("===== DRAFT PROMPT =====");
    console.log(draftPrompt);

    const draftResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [ { role: 'user', content: draftPrompt } ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const draftReport = draftResponse.data.choices[0].message.content;
    console.log("===== DRAFT REPORT =====");
    console.log(draftReport);

    // 3) Call ChatGPT to verify/correct the draft
    const verifyPrompt = `
Check if the attached log (text + tables) and the following report are consistent. 
Correct any inconsistencies. Return only the verified report, without extra commentary.

Log Text:
${pdfText}

Log Tables:
${JSON.stringify(pdfTables)}

Draft Report:
${draftReport}
`;
    console.log("===== VERIFY PROMPT =====");
    console.log(verifyPrompt);

    const verifyResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [ { role: 'user', content: verifyPrompt } ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const verifiedReport = verifyResponse.data.choices[0].message.content;
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
