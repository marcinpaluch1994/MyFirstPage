document.getElementById('get-data').addEventListener('click', async () => {
    try {
        const response = await fetch('http://localhost:3000/random-poem');
        const data = await response.json();
        document.getElementById('output').textContent = data.poem;
    } catch (error) {
        console.error('Error fetching ChatGPT output:', error);
        document.getElementById('output').textContent = 'Failed to fetch ChatGPT output.';
    }
});
