document.getElementById('get-data').addEventListener('click', async () => {
    try {
        const response = await fetch('https://0718-194-230-148-34.ngrok-free.app/random-poem');
        // For debugging, look at the raw text:
        const text = await response.text();
        console.log('Raw response:', text);

        // Then parse JSON (if it’s valid JSON, otherwise this will throw)
        const data = JSON.parse(text);
        document.getElementById('output').textContent = data.poem;
    } catch (error) {
        console.error('Error fetching ChatGPT output:', error);
        document.getElementById('output').textContent = 'Failed to fetch ChatGPT output. So sorry!';
    }
});
