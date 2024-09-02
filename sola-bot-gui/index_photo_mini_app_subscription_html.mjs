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

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Load subscriptions from file
let subscriptions = new Map();
if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
    subscriptions = new Map(JSON.parse(data));
}

const saveSubscriptions = () => {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([...subscriptions]));
};

const init = async () => {
    const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
    console.log(res.data);
    await setCommands();
};

const setCommands = async () => {
    const commands = [
        { command: '/start', description: 'Start the bot' },
        { command: '/showgroups', description: 'Show available groups' },
        { command: '/subscribe', description: 'Subscribe here' },
        { command: '/unsubscribe', description: 'Unsubscribe here' }
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

app.get('/api/subscribed-groups', (req, res) => {
    const chatId = req.query.chatId;
    
    if (!subscriptions.has(chatId)) {
  
        console.log("empty")
        return res.json([]);  // Return an empty array if no subscriptions are found for this chatId

    }
    const subscriptionList = [...subscriptions];
    const filteredList = subscriptionList.filter(item => item[0] === chatId);
    res.json(filteredList.length > 0 ? filteredList[0][1] : []);
});




app.post('/subscribe', (req, res) => {
    const { chatId, groupId, groupName } = req.body;
    if (!subscriptions.has(chatId)) {
        subscriptions.set(chatId, []);
    }
    const userSubscriptions = subscriptions.get(chatId);
    if (!userSubscriptions.some(sub => sub.groupId === groupId)) {
        userSubscriptions.push({ groupId, groupName });
        saveSubscriptions();
        res.json({ message: `You have subscribed to ${groupName} (Group ID: ${groupId}) messages.` });
    } else {
        res.json({ message: `You are already subscribed to ${groupName} (Group ID: ${groupId}).` });
    }
});

app.post('/unsubscribe', (req, res) => {
    const { chatId, groupId } = req.body;
    if (subscriptions.has(chatId)) {
        const userSubscriptions = subscriptions.get(chatId);
        const updatedSubscriptions = userSubscriptions.filter(sub => sub.groupId !== groupId);
        if (updatedSubscriptions.length > 0) {
            subscriptions.set(chatId, updatedSubscriptions);
        } else {
            subscriptions.delete(chatId);
        }
        saveSubscriptions();
        res.json({ message: `You have successfully unsubscribed from ${groupName}.` });
    } else {
        res.json({ message: 'You are not currently subscribed to this group.' });
    }
});




const sendPeriodicMessages = () => {
    setInterval(async () => {
        for (let [chatId, userSubscriptions] of subscriptions) {
            for (let sub of userSubscriptions) {
                try {
                    await axios.post(`${TELEGRAM_API}/sendMessage`, {
                        chat_id: chatId,
                        text: `This is a periodic message for ${sub.groupName} (Group ID: ${sub.groupId}).`,
                        parse_mode: 'Markdown'
                    });
                } catch (error) {
                    console.error(`Failed to send message to chat ${chatId}:`, error);
                }
            }
        }
    }, 20000);
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

        case '/subscribe':
            const subscriptionUrl = `${SERVER_URL}/subscription.html`;
     
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'You have subscribed to periodic messages. Click the button below to view more details or type /unsubscribe to stop receiving messages.',
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{
                        text: 'Subscription Details',
                        web_app: {
                            url: subscriptionUrl
                        }
                    }]]
                }
            });
            break;


        case '/unsubscribe':
            const unsubscribeUrl = `${SERVER_URL}/unsubscribe.html?chatId=${chatId}`;
            console.log(unsubscribeUrl );
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: 'Click the button below to confirm your unsubscription:',
                reply_markup: {
                    inline_keyboard: [[{
                        text: 'Unsubscribe',
                        web_app: {
                            url: unsubscribeUrl
                        }
                    }]]
                }
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

await init();
sendPeriodicMessages();

app.listen(process.env.PORT || 5001, () => {
    console.log(`🚀 App running on port ${process.env.PORT || 5001}`);
});
