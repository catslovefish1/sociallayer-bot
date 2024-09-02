import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import { fetchGroups } from './sola.mjs';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TOKEN;
const SERVER_URL = process.env.SERVER_URL;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const URI = `/webhook/${TOKEN}`;
const WEBHOOK_URL = `${SERVER_URL}${URI}`;

const app = express();
app.use(bodyParser.json());

const init = async () => {
    // Set up webhook
    const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
    console.log(res.data);

    // Set bot commands
    await setCommands();
};

const setCommands = async () => {
    const commands = [
        { command: '/start', description: 'Start the bot' },
        { command: '/showgroups', description: 'Show available groups' },
        { command: '/subscription', description: 'Subscription for you' }
    ];

    try {
        await axios.post(`${TELEGRAM_API}/setMyCommands`, { commands });
        console.log('Commands have been set successfully.');
    } catch (error) {
        console.error('Error setting commands:', error);
    }
};

app.get('/groups', async (req, res) => {
    const groupsData = await fetchGroups();
    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta property="og:title" content="Group Events">
            <meta property="og:description" content="Check out our amazing group events.">
            <meta property="og:image" content="${groupsData.groups.length > 0 ? groupsData.groups[0].image_url : ''}">
            <meta property="og:url" content="https://${req.hostname}/groups">
            <title>Group Events</title>
            <style>
                .group-container {
                    display: flex;
                    flex-wrap: wrap;
                }
                .group-container a {
                    margin: 10px;
                }
                .group-container img {
                    width: 200px;
                }
            </style>
        </head>
        <body>
            <div class="group-container">`;
    
    groupsData.groups.forEach(group => {
        html += `
            <a href="https://sola.day/event/${group.username}" target="_blank">
                <img src="${group.image_url}" alt="${group.username}">
            </a>`;
    });

    html += `
            </div>
        </body>
        </html>`;
    
    res.send(html);
});


app.post(URI, async (req, res) => {
    console.log(req.body);

    const message = req.body.message || req.body.edited_message;
    if (!message) {
        console.error('Unexpected payload structure:', req.body);
        return res.sendStatus(400);
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    switch (text) {
        case '/start':
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'Welcome! Use /showgroups to see available groups or /subscription to subscribe.',
                parse_mode: 'Markdown'
            });
            break;
            case '/showgroups':
                // Send URL to the groups web page
                const serverUrl = process.env.SERVER_URL; // Make sure this is set in your .env file
                const groupsPageUrl = `${serverUrl}/groups`;
                console.log(groupsPageUrl);
                const responseText = `View all our groups [here](${groupsPageUrl}).`;
                await axios.post(`${TELEGRAM_API}/sendMessage`, {
                    chat_id: chatId,
                    text: responseText,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: false // Ensure this is set to false
                });
                break;

        case '/subscription':
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'To subscribe, please visit our website at [sola.day](https://sola.day).',
                parse_mode: 'Markdown'
            });
            break;

        default:
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'Sorry, I did not understand that command. Use /start to see the list of available commands.',
                parse_mode: 'Markdown'
            });
    }

    return res.sendStatus(200);
});

app.listen(process.env.PORT || 5001, async () => {
    console.log(`🚀 App running on port ${process.env.PORT || 5001}`);
    await init();
});
