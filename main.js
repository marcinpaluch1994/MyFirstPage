document.getElementById('get-data').addEventListener('click', async () => {
    try {
        const response = await fetch('https://fb40-194-230-148-121.ngrok-free.app/random-poem');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        document.getElementById('output').textContent = data.poem;
    } catch (error) {
        console.error('Error fetching ChatGPT output:', error);
        document.getElementById('output').textContent = 'Failed to fetch ChatGPT output. So sorry!';
    }
});
