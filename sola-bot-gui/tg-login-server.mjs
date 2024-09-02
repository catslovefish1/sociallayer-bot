import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import crypto from 'crypto';

const TOKEN = process.env.TOKEN;
const app = express();

app.use(express.static('public'));

// Telegram Login callback handling
app.get('/login/telegram/callback', (req, res) => {
    try {
        const data = req.query;
        const receivedHash = data.hash;
        delete data.hash;

        // Sort the keys and concatenate the values
        const sortedKeys = Object.keys(data).sort();
        const dataCheckString = sortedKeys.map(key => `${key}=${data[key]}`).join('\n');

        // Generate the HMAC SHA-256 hash using your bot's token
        const secretKey = crypto.createHash('sha256').update(TOKEN).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (receivedHash === computedHash) {
            // Hashes match, login is successful
            console.log('User authenticated:', data);
            res.send(`Welcome, ${data.first_name}! You have successfully logged in with Telegram.`);
        } else {
            // Hashes do not match, login failed
            res.status(403).send('Verification failed.');
        }
    } catch (error) {
        console.error('Error processing login callback:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
