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

// Single-step endpoint
app.post('/generate-report-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // 1) Extract text from PDF (handle parse errors)
    let pdfLog = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      pdfLog = pdfData.text || '';
    } catch (parseError) {
      console.error('Error parsing PDF:', parseError);
      // In case of parse errors, we proceed with an empty log
      pdfLog = '';
    }

    // 2) Call ChatGPT to get first draft
    const draftPrompt = `
Generate a summary of doctor actions for a medical report based on this log:
${pdfLog}

Not a list of actions but rather a coherent text. Use formal, clinical language, as if a specialist doctor would write for another specialist doctor taking over the patient. Be concise, but make sure to include all information about actions taken by the doctor.
`;

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

    // 3) Call ChatGPT to verify/correct the draft
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
