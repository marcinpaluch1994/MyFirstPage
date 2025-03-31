// index.js

// Load environment variables from .env file
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for requests from anywhere (for debugging).
// Later you can lock it down to your GitHub Pages domain if you like.
app.use(cors({
    origin: '*'
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Quick log to confirm the server and the environment key:
console.log("========================================");
console.log("Starting Express server with the following config:");
console.log("PORT:", PORT);
console.log("OpenAI Key present?", process.env.OPENAI_API_KEY ? "Yes" : "No");
console.log("========================================");

// Additional debugging route to confirm server is alive
app.get('/ping', (req, res) => {
    console.log("Received /ping request from", req.headers['user-agent']);
    res.json({ message: 'pong', time: new Date().toISOString() });
});

app.get('/random-poem', async (req, res) => {
    console.log("Received /random-poem request from", req.headers['user-agent']);
    try {
        // Make a POST request directly to OpenAI's chat completions API
        const apiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: 'You are a living webpage. Go crazy out of joy, because Anna, the most wonderful woman in the world, opened you. But be concise, 2-3 sentences.',
                    },
                ],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                }
            }
        );

        console.log("OpenAI response status:", apiResponse.status);
        console.log("OpenAI response data:", apiResponse.data);

        // Extract the ChatGPT response
        const poem = apiResponse.data.choices[0].message.content;
        res.json({ poem });
    } catch (error) {
        console.error('Error fetching poem from OpenAI:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        res.status(500).json({ error: 'Failed to fetch poem' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
