require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = 'https://api.alphabot.app/v1';

const corsOptions = {
    origin: '*',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to fetch the raffle slugs from the AlphaBot API
async function getRaffleSlugs(apiKey) {
    try {
        let page = 0;
        let allSlugs = [];
        while (true) {
            const response = await axios.get(`${API_URL}/raffles`, {
                headers: { 'Authorization': `Bearer ${apiKey}` },
                params: {
                    filter: 'unregistered',
                    sortBy: 'ending',
                    pageSize: 50,
                    pageNum: page,
                },
            });
            const data = response.data;
            if (!data.success) {
                throw new Error('API Error: ' + data.errors[0].message);
            }
            allSlugs.push(...data.data.raffles.map(item => item.slug));
            if (data.data.finalPage) break;
            page += 1;
        }
        return allSlugs;
    } catch (error) {
        if (error.response) {
            // Server responded with a status code that falls out of the range of 2xx
            console.error(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
            throw new Error(`HTTP Error: ${error.response.status} - ${error.response.data?.errors?.[0]?.message || error.response.statusText}`);
        } else if (error.request) {
            // Request was made but no response was received
            console.error('Network Error: No response received from API');
            throw new Error('Network Error: No response received from API');
        } else {
            // Something happened in setting up the request
            console.error('Error: ' + error.message);
            throw new Error('Unexpected Error: ' + error.message);
        }
    }
}

// Function to join raffles using the provided slugs
async function joinRaffles(apiKey, slugs) {
    let results = [];
    for (const slug of slugs) {
        try {
            const response = await axios.post(`${API_URL}/register`, 
                { slug: slug }, 
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            );
            if (response.data.success) {
                const successMsg = `Successfully registered for ${slug}`;
                console.log(successMsg);
                results.push(successMsg);
            } else {
                const failMsg = `Failed to register for ${slug}: ${response.data.errors[0].message}`;
                console.error(failMsg);
                results.push(failMsg);
            }
        } catch (error) {
            if (error.response) {
                const errorMsg = `HTTP Error while registering for ${slug}: ${error.response.status} - ${error.response.statusText}`;
                console.error(errorMsg);
                results.push(errorMsg);
            } else if (error.request) {
                const errorMsg = `Network Error while registering for ${slug}: No response received from API`;
                console.error(errorMsg);
                results.push(errorMsg);
            } else {
                const errorMsg = `Unexpected Error while registering for ${slug}: ${error.message}`;
                console.error(errorMsg);
                results.push(errorMsg);
            }
        }
    }
    return results;
}

// Route to handle the raffle joining process
app.post('/join-raffles', async (req, res) => {
    const apiKey = req.body.apiKey;
    console.log('Received API key:', apiKey);

    try {
        console.log('Fetching raffles...');
        const slugs = await getRaffleSlugs(apiKey);

        if (slugs.length) {
            console.log('Joining raffles...');
            const results = await joinRaffles(apiKey, slugs);
            res.status(200).json({ message: results });
        } else {
            res.status(200).json({ message: ['No raffles to join.'] });
        }
    } catch (error) {
        res.status(500).json({ error: `Server Error: ${error.message}` });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});