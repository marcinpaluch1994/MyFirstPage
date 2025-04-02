/***********************************************************************
  HARD-CODED SERVER URL:
  e.g. "https://some-lt-url.loca.lt" or "http://localhost:3000"
***********************************************************************/
const SERVER_URL = "https://busy-boxes-relax.loca.lt"; // or your localtunnel URL

// For localtunnel bypass, add a user-agent that looks like a browser
// plus any custom headers if needed
const SPECIAL_HEADERS = {
  'bypass-tunnel-reminder': 'mycustomvalue', // remove or change if not needed
};

const debugEl = document.getElementById('debug');
const statusEl = document.getElementById('status');
const pdfFileInput = document.getElementById('pdfFile');

pdfFileInput.addEventListener('change', async () => {
  if (!pdfFileInput.files || pdfFileInput.files.length === 0) {
    return;
  }

  statusEl.textContent = 'Uploading PDF...';
  debugEl.textContent = '';

  const file = pdfFileInput.files[0];

  // Prepare form data
  const formData = new FormData();
  formData.append('pdfFile', file);

  try {
    // --- Provide some naive progress updates on the client side ---
    statusEl.textContent = 'Drafting first version...';

    // Small delay to let the user see the first status
    await new Promise(resolve => setTimeout(resolve, 800));

    statusEl.textContent = 'Verifying and improving...';

    // Another small delay
    await new Promise(resolve => setTimeout(resolve, 800));

    statusEl.textContent = 'Preparing for download...';

    // Now perform the final fetch that triggers the entire ChatGPT pipeline
    const response = await fetch(`${SERVER_URL}/generate-report-pdf`, {
      method: 'POST',
      headers: SPECIAL_HEADERS,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    // The response is a PDF, so read it as blob
    const blob = await response.blob();
    // Create download link
    const blobUrl = URL.createObjectURL(blob);

    // Download automatically
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'medical_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    statusEl.textContent = 'Final PDF downloaded!';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error generating PDF. Check debug logs.';
    debugEl.textContent = err.toString();
  }
});
