document.getElementById('get-data').addEventListener('click', async () => {
    const response = await fetch('https://your-node-api-url.com/data');
    const data = await response.json();
    document.getElementById('output').textContent = JSON.stringify(data);
});
