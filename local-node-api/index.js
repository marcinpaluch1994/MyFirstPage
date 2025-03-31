// index.js

// Load environment variables from .env file
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const axios = require('axios'); // New dependency to replace openai package

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for requests only from your GitHub Pages site
app.use(cors({
    origin: function (origin, callback) {
        // Log the origin to see exactly what value is being sent by the browser.
        console.log("Incoming request with Origin:", origin);

        // Allow requests with no origin (mobile apps, curl, etc.) or if the origin starts with the allowed URL.
        if (!origin || origin.startsWith('https://marcinpaluch1994.github.io')) {
            callback(null, true);
        } else {
            console.error(`CORS Error: Request from origin ${origin} is not allowed.`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    }
}));

console.log(`Started.`);

// Middleware to parse JSON bodies (optional, useful for POST requests)
app.use(express.json());

// Endpoint to fetch a response from ChatGPT via direct API call using axios
app.get('/random-poem', async (req, res) => {
    console.log("Request headers:", req.headers);
    try {
        // Make a POST request directly to OpenAI's chat completions API
        const apiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions', // OpenAI endpoint
            {
                model: 'gpt-3.5-turbo', // Using the gpt-3.5-turbo model
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
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Use your API key from .env
                }
            }
        );

        // Extract the ChatGPT response from the API response
        const poem = apiResponse.data.choices[0].message.content;
        res.json({ poem });
    } catch (error) {
        console.error('Error fetching poem:', error.response ? error.response.status : error.message);
        res.status(500).json({ error: 'Failed to fetch poem' });
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
