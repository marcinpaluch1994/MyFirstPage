document.getElementById('get-data').addEventListener('click', async () => {
    try {
        const response = await fetch('https://56cc-194-230-148-121.ngrok-free.app');
        const data = await response.json();
        document.getElementById('output').textContent = data.poem;
    } catch (error) {
        console.error('Error fetching ChatGPT output:', error);
        document.getElementById('output').textContent = 'Failed to fetch ChatGPT output.';
    }
});
