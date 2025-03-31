// main.js

document.getElementById('get-data').addEventListener('click', async () => {
    console.log("Button clicked!"); // Debug: check if the event fires
    try {
        const response = await fetch('https://a458-194-230-148-34.ngrok-free.app/random-poem');
        console.log("Response received:", response); // Debug: inspect the response
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Data parsed:", data); // Debug: inspect parsed JSON
        document.getElementById('output').textContent = data.poem;
    } catch (error) {
        console.error('Error fetching ChatGPT output:', error);
        document.getElementById('output').textContent = 'Failed to fetch ChatGPT output. So sorry!';
    }
});

