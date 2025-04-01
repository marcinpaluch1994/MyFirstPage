// main.js

/***********************************************************************
  HARD-CODED SERVER (LOCALTUNNEL) URL:

  Update this to point to your actual server address.
  Example:
    const SERVER_URL = "https://some-lt-url.loca.lt";
***********************************************************************/
const SERVER_URL = "https://two-jeans-cough.loca.lt"; // <-- UPDATE AS NEEDED

/***********************************************************************
  REST OF THE SCRIPT
***********************************************************************/

const debugEl = document.getElementById('debug');
const statusEl = document.getElementById('status');
const draftReportEl = document.getElementById('draftReport');
const verifiedReportEl = document.getElementById('verifiedReport');
const pdfFileInput = document.getElementById('pdfFile');

// Whenever the user selects a PDF file, automatically run the pipeline
pdfFileInput.addEventListener('change', () => {
  if (!pdfFileInput.files || pdfFileInput.files.length === 0) {
    return;
  }
  startPipeline();
});

async function startPipeline() {
  debugEl.textContent = '';
  draftReportEl.textContent = '';
  verifiedReportEl.textContent = '';

  const file = pdfFileInput.files[0];
  if (!file) {
    statusEl.textContent = 'No file selected!';
    return;
  }

  // 1) Draft
  statusEl.textContent = 'Drafting first version...';
  const draftResponseData = await doDraft(file);
  if (!draftResponseData) {
    statusEl.textContent = 'Error during drafting. Check debug logs.';
    return;
  }
  const { draftReport, pdfLog } = draftResponseData;
  draftReportEl.textContent = draftReport;

  // 2) Verify
  statusEl.textContent = 'Verifying and improving...';
  const verifyResponseData = await doVerify(pdfLog, draftReport);
  if (!verifyResponseData) {
    statusEl.textContent = 'Error during verification. Check debug logs.';
    return;
  }
  const { verifiedReport } = verifyResponseData;
  verifiedReportEl.textContent = verifiedReport;

  // 3) Generate PDF
  statusEl.textContent = 'Preparing for download...';
  const pdfResult = await doGeneratePdf(verifiedReport);
  if (!pdfResult) {
    statusEl.textContent = 'Error generating PDF. Check debug logs.';
    return;
  }

  statusEl.textContent = 'PDF generated and downloaded!';
}

// Helper: Step 1 (POST /draft)
async function doDraft(file) {
  const formData = new FormData();
  formData.append('pdfFile', file);

  try {
    const response = await fetch(`${SERVER_URL}/draft`, {
      method: 'POST',
      headers: {
        'bypass-tunnel-reminder': 'mycustomvalue',
        'User-Agent': 'MyFancyScript/1.0 (my custom agent)'
      },
      body: formData
    });
    if (!response.ok) {
      throw new Error(`Draft step error: ${response.statusText}`);
    }
    const data = await response.json();
    debugEl.textContent += `Draft response:\n${JSON.stringify(data, null, 2)}\n`;
    return data;
  } catch (err) {
    console.error(err);
    debugEl.textContent += `\n${err.toString()}\n`;
    return null;
  }
}

// Helper: Step 2 (POST /verify)
async function doVerify(pdfLog, draftReport) {
  try {
    const response = await fetch(`${SERVER_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'mycustomvalue',
        'User-Agent': 'MyFancyScript/1.0 (my custom agent)'
      },
      body: JSON.stringify({ pdfLog, draftReport })
    });
    if (!response.ok) {
      throw new Error(`Verify step error: ${response.statusText}`);
    }
    const data = await response.json();
    debugEl.textContent += `Verify response:\n${JSON.stringify(data, null, 2)}\n`;
    return data;
  } catch (err) {
    console.error(err);
    debugEl.textContent += `\n${err.toString()}\n`;
    return null;
  }
}

// Helper: Step 3 (POST /generate-pdf)
async function doGeneratePdf(verifiedReport) {
  try {
    const response = await fetch(`${SERVER_URL}/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'mycustomvalue',
        'User-Agent': 'MyFancyScript/1.0 (my custom agent)'
      },
      body: JSON.stringify({ verifiedReport })
    });
    if (!response.ok) {
      throw new Error(`Generate PDF step error: ${response.statusText}`);
    }

    // Expect PDF, so read as Blob
    const blob = await response.blob();
    // Create a link to download the PDF
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medical_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (err) {
    console.error(err);
    debugEl.textContent += `\n${err.toString()}\n`;
    return null;
  }
}
