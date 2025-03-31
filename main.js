document.getElementById('get-data').addEventListener('click', async () => {
    const debugEl = document.getElementById('debug');
    debugEl.textContent = ''; // Clear old debug info

    const url = 'https://e4a1-194-230-148-34.ngrok-free.app/random-poem'; // double-check this matches what ngrok shows
    debugEl.textContent += `Attempting fetch to: ${url}\n`;

    try {
        // Perform the fetch
        const response = await fetch(url);

        debugEl.textContent += `Response status: ${response.status}\n`;
        debugEl.textContent += `Response headers:\n`;
        response.headers.forEach((val, key) => {
            debugEl.textContent += `  ${key}: ${val}\n`;
        });

        // Try reading raw text for debugging
        const rawText = await response.text();
        debugEl.textContent += `\nRaw text received:\n${rawText}\n\n`;

        // Then try to parse it as JSON (if it fails, it’s not valid JSON)
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseErr) {
            console.error("JSON parse error:", parseErr);
            debugEl.textContent += `JSON parse error: ${parseErr}\n`;
            throw new Error('Failed to parse JSON from server');
        }

        // If parsing worked, check what we got
        console.log('Parsed JSON:', data);
        debugEl.textContent += `\nParsed JSON:\n${JSON.stringify(data, null, 2)}\n`;

        // Finally, show data in the #output
        document.getElementById('output').textContent = data.poem || 'No poem field found.';

    } catch (error) {
        console.error('Error fetching ChatGPT output:', error);
        debugEl.textContent += `\nFetch error: ${error}\n`;
        document.getElementById('output').textContent = 'Failed to fetch ChatGPT output. So sorry!';
    }
});
