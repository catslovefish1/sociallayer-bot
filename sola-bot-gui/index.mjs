import { fetchGroups } from './fetchGroups.mjs';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';

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
        {command: '/subscription', description: 'Subscription for you' }
        // Add more commands if needed
    ];

    try {
        await axios.post(`${TELEGRAM_API}/setMyCommands`, { commands });
        console.log('Commands have been set successfully.');
    } catch (error) {
        console.error('Error setting commands:', error);
    }
};





// Handle incoming messages
app.post(URI, async (req, res) => {
    console.log(req.body);

    const message = req.body.message || req.body.edited_message;
    if (!message) {
        console.error('Unexpected payload structure:', req.body);
        return res.send();
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    let responseText;

    switch (text) {
        case '/start':
            responseText = 'Welcome! Use /showgroups to see available groups or /subscription to subscribe.';
            break;
        case '/showgroups':
            const groupsData = await fetchGroups();
            responseText = groupsData.groups.map(group => `**${group.username}** (ID: ${group.id}) - Events: ${group.events_count} - [https://sola.day/event/${group.username}](https://sola.day/event/${group.username})`).join('\n');
            // responseText = groupsData.groups.map(group => `https://sola.day/event/${group.username}`).join('\n');
            break;
        case '/subscription':
            responseText = 'To subscribe, please visit our website at [sola.day](https://sola.day).';
            break;
        default:
            responseText = 'Sorry, I did not understand that command. Use /start to see the list of available commands.';
    }



    await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
    });

    return res.send();
});

app.listen(process.env.PORT || 5001, async () => {
    console.log('🚀 app running on port', process.env.PORT || 5001);
    await init();
});


