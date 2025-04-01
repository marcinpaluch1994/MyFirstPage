document.getElementById('get-data').addEventListener('click', async () => {
  const debugEl = document.getElementById('debug');
  debugEl.textContent = ''; // Clear debug area

  // Your localtunnel endpoint:
  const url = 'https://modern-flowers-float.loca.lt/random-poem';
  debugEl.textContent += `Attempting fetch to: ${url}\n`;

  try {
    const response = await fetch(url, {
      headers: {
        // Non-standard header that localtunnel checks:
        'bypass-tunnel-reminder': 'mycustomvalue',

        // A custom user-agent that is NOT recognized as a standard browser
        'User-Agent': 'MyFancyScript/1.0 (my custom agent)',
      }
    });

    debugEl.textContent += `Response status: ${response.status}\n`;
    debugEl.textContent += `Response status text: ${response.statusText}\n`;
    debugEl.textContent += `Response headers:\n`;
    response.headers.forEach((val, key) => {
      debugEl.textContent += `  ${key}: ${val}\n`;
    });

    // Let's attempt reading raw text
    const rawText = await response.text();
    debugEl.textContent += `\n=== RAW TEXT START ===\n${rawText}\n=== RAW TEXT END ===\n`;

    // Now try to parse as JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      debugEl.textContent += `\nJSON parse error: ${parseErr}\n`;
      throw new Error('Failed to parse JSON (did we get HTML again?)');
    }

    debugEl.textContent += `\nParsed JSON:\n${JSON.stringify(data, null, 2)}\n`;
    document.getElementById('output').textContent = data.poem || 'No poem field!';
  } catch (error) {
    debugEl.textContent += `\nFetch error: ${error}\n`;
    console.error('Error fetching ChatGPT output:', error);
    document.getElementById('output').textContent =
      'Error! Possibly still an interstitial page. Check debug logs.';
  }
});
