// main.js
const debugEl = document.getElementById('debug');
const statusEl = document.getElementById('status');

const draftReportEl = document.getElementById('draftReport');
const verifiedReportEl = document.getElementById('verifiedReport');

let pdfLog = '';        // Extracted text from uploaded PDF
let draftReport = '';   // First draft from ChatGPT
let verifiedReport = ''; // Verified/corrected version

// Buttons
const btnDraft = document.getElementById('btnDraft');
const btnVerify = document.getElementById('btnVerify');
const btnGeneratePdf = document.getElementById('btnGeneratePdf');

// PDF file input
const pdfFileInput = document.getElementById('pdfFile');

// Step 1: Draft the first version
btnDraft.addEventListener('click', async () => {
  debugEl.textContent = '';
  if (!pdfFileInput.files || pdfFileInput.files.length === 0) {
    alert('Please select a PDF file first.');
    return;
  }

  statusEl.textContent = 'Drafting first version...';

  const file = pdfFileInput.files[0];
  const formData = new FormData();
  formData.append('pdfFile', file);

  try {
    const response = await fetch('/draft', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    pdfLog = data.pdfLog;
    draftReport = data.draftReport;

    draftReportEl.textContent = draftReport;
    statusEl.textContent = 'Draft completed.';
    debugEl.textContent = JSON.stringify(data, null, 2);

    // Enable "Verify" button
    btnVerify.disabled = false;
    btnGeneratePdf.disabled = true;

  } catch (err) {
    console.error(err);
    debugEl.textContent += '\n' + err.toString();
    statusEl.textContent = 'Failed to draft report.';
  }
});

// Step 2: Verify/Correct the draft
btnVerify.addEventListener('click', async () => {
  statusEl.textContent = 'Verifying and improving...';
  verifiedReportEl.textContent = '';
  debugEl.textContent = '';

  try {
    const response = await fetch('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfLog,
        draftReport
      })
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    verifiedReport = data.verifiedReport;

    verifiedReportEl.textContent = verifiedReport;
    statusEl.textContent = 'Verification completed.';
    debugEl.textContent = JSON.stringify(data, null, 2);

    // Enable "Generate PDF" button
    btnGeneratePdf.disabled = false;

  } catch (err) {
    console.error(err);
    debugEl.textContent += '\n' + err.toString();
    statusEl.textContent = 'Failed to verify report.';
  }
});

// Step 3: Generate PDF
btnGeneratePdf.addEventListener('click', async () => {
  statusEl.textContent = 'Preparing for download...';
  debugEl.textContent = '';

  try {
    // We'll POST the verified text and expect a PDF file back
    const response = await fetch('/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedReport })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    // We expect a PDF, so read as Blob
    const blob = await response.blob();

    // Create a link to download the PDF
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medical_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    statusEl.textContent = 'PDF generated and downloaded!';
  } catch (err) {
    console.error(err);
    debugEl.textContent += '\n' + err.toString();
    statusEl.textContent = 'Failed to generate PDF.';
  }
});
