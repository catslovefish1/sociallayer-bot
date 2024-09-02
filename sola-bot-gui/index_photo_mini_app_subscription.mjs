import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import { fetchGroups } from './fetchGroups.mjs';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const TOKEN = process.env.TOKEN;
const SERVER_URL = process.env.SERVER_URL;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const URI = `/webhook/${TOKEN}`;
const WEBHOOK_URL = `${SERVER_URL}${URI}`;
const SUBSCRIPTIONS_FILE = './subscriptions.json';

const app = express();
app.use(bodyParser.json());



// Load subscriptions from file
let subscriptions = new Set();
if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
    subscriptions = new Set(JSON.parse(data));
}

const saveSubscriptions = () => {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([...subscriptions]));
};

// Serve static files from the 'public' directory
app.use(express.static('public'));

const init = async () => {
    const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
    console.log(res.data);
    await setCommands();
};

const setCommands = async () => {
    const commands = [
        { command: '/start', description: 'Start the bot' },
        { command: '/showgroups', description: 'Show available groups' },
        { command: '/subscription', description: 'Subscription for you' },
        { command: '/unsubscription', description: 'Unsubscription for you' },

    ];
    try {
        await axios.post(`${TELEGRAM_API}/setMyCommands`, { commands });
        console.log('Commands have been set successfully.');
    } catch (error) {
        console.error('Error setting commands:', error);
    }
};

app.get('/api/groups', async (req, res) => {
    const groupsData = await fetchGroups();
    res.json(groupsData.groups);
});

const sendPeriodicMessages = () => {
    setInterval(async () => {
        for (let chatId of subscriptions) {
            try {
                await axios.post(`${TELEGRAM_API}/sendMessage`, {
                    chat_id: chatId,
                    text: 'This is a periodic message.',
                    parse_mode: 'Markdown'
                });
            } catch (error) {
                console.error(`Failed to send message to chat ${chatId}:`, error);
            }
        }
    }, 2000);
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

    switch (text) {
        case '/start':
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'Welcome! Use /showgroups to see available groups or /subscription to subscribe.',
                parse_mode: 'Markdown'
            });
            break;

            case '/showgroups':
                const webAppUrl = `${SERVER_URL}/showgroups.html`;
                await axios.post(`${TELEGRAM_API}/sendMessage`, {
                    chat_id: chatId,
                    text: 'Click the button below to view the groups:',
                    reply_markup: {
                        inline_keyboard: [[{
                            text: 'View Groups',
                            web_app: {
                                url: webAppUrl
                            }
                        }]]
                    }
                });
                break;

        case '/subscription':
            subscriptions.add(chatId);
            saveSubscriptions();
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'You have subscribed to periodic messages. To unsubscribe, type /unsubscribe.',
                parse_mode: 'Markdown'
            });
            break;

        case '/unsubscription':
            subscriptions.delete(chatId);
            saveSubscriptions();
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'You have unsubscribed from periodic messages.',
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

    return res.send();
});

app.listen(process.env.PORT || 5001, async () => {
    console.log(`🚀 App running on port ${process.env.PORT || 5001}`);
    await init();
    sendPeriodicMessages();
});
