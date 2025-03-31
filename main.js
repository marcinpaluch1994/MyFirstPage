// main.js

document.getElementById('get-data').addEventListener('click', async () => {
    console.log("Button clicked!");
    try {
        const response = await fetch(' https://52c3-194-230-148-34.ngrok-free.app');
        console.log("Response received:", response);
        // Get the raw text response first to inspect it
        const text = await response.text();
        console.log("Raw response text:", text);
        // Now try parsing it
        const data = JSON.parse(text);
        console.log("Parsed data:", data);
        document.getElementById('output').textContent = data.poem;
    } catch (error) {
        console.error('Error fetching ChatGPT output:', error);
        document.getElementById('output').textContent = 'Failed to fetch ChatGPT output. So sorry!';
    }
});


