const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const PDFDocument = require('pdfkit');
const axios = require('axios');

/////////////////////////////////////
// 1) parsePdfWithPdfplumber
/////////////////////////////////////
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

    // Send the PDF buffer to the Python script via stdin
    py.stdin.write(pdfBuffer);
    py.stdin.end();
  });
}

/////////////////////////////////////
// 2) callOllama (for Ollama 0.6+)
/////////////////////////////////////
async function callOllama(prompt) {
  // Ollama model name you installed:
  const OLLAMA_MODEL = "llama3.2:latest";

  // Ollama 0.6.x listens on 127.0.0.1:11434 by default, and uses POST /api/generate
  const endpoint = 'http://127.0.0.1:11434/api/generate';

  try {
    // "stream: false" means we get the entire completion as JSON, not SSE tokens
    const requestBody = {
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    };

    const response = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'json'
    });

    // Return the text response from Ollama.
    return response.data.response;
  } catch (error) {
    console.error('Error calling Ollama:', error.message);
    throw error;
  }
}

/////////////////////////////////////
// 3) Main logic to test locally
/////////////////////////////////////
(async function main() {
  try {
    // 1) Read a local PDF
    const pdfFilePath = path.join(__dirname, 'ICU_Doctor_Log.pdf');
    const pdfBuffer = fs.readFileSync(pdfFilePath);

    // 2) Extract text (and tables) from PDF
    const result = await parsePdfWithPdfplumber(pdfBuffer);
    const pdfText = result.text || '';

    // 3) Generate a draft with Ollama
    // ---- Revised Draft Prompt ----
    // Additional instructions: Ensure a continuous, coherent narrative, not a bullet list.
    const draftPrompt = `
You are a specialist physician composing a concise, formal handover report solely based on the following PDF log. Generate a continuous narrative (not a list) that summarizes clinical interventions and observations in full prose.

PDF Log:
${pdfText}

Guidelines:
- Use formal, clinical language.
- Include only data present in the log.
- Exclude extraneous details and invented commentary.
- Include dates/times only if clinically necessary.
- Do not generate a list or bullet points—produce a unified narrative.
- Minimize usage of any unnecessary filler phrases, stylistic modifiers, rhetorical operators.
- write in first person singular
    `;
    const draftReport = await callOllama(draftPrompt);

    console.log(draftPrompt);

    // 4) Verify/correct the draft and produce the final report.
    // ---- Revised Verification Prompt ----
    // Emphasizes a single narrative paragraph and strictly no additional information.
    const verifyPrompt = `
Compare the following draft report with the attached PDF log. Remove any content not substantiated by the log, ensuring that the output is a single, concise narrative. 

PDF Log:
${pdfText}

Draft Report:
${draftReport}

Refinement Guidelines:
- Return one unified paragraph.
- Use formal clinical language.
- DO NOT add any information not present in the PDF log.
- Do not output a list or bullet points; the narrative should be seamless.
- Provide only the final report without extra commentary.
    `;
    const verifiedReport = await callOllama(verifyPrompt);

    // Print only the final verified report without any additional comments.
    console.log(verifiedReport);

    // 5) Create a local PDF file named "test_output.pdf"
    const outPdfPath = path.join(__dirname, 'test_output.pdf');
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(outPdfPath);

    doc.pipe(writeStream);
    doc.fontSize(16).text('Medical Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(verifiedReport, { align: 'left' });
    doc.end();

    writeStream.on('finish', () => {
      // Optionally, log PDF creation status
      console.log(`Generated local PDF: ${outPdfPath}`);
    });

  } catch (err) {
    console.error("Error in local test script:", err);
  }
})();
