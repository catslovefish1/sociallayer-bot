import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import { fetchGroups } from './fetchGroups.mjs';
import { fetchEventById } from './fetchEventById.mjs';

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

// Assuming a simple array of objects to store subscriptions
let subscriptions = [];

const saveSubscriptions = () => {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
};

const loadSubscriptions = () => {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
        subscriptions = JSON.parse(data);
    }
};

loadSubscriptions();  // Load subscriptions when the app starts



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
    console.log(req.query.chatId); // Check what you actually receive
    console.log(typeof req.query.chatId); // Check the type of chatId received

    const userSubscriptions = subscriptions.filter(sub => String(sub.chatId) === req.query.chatId);
    console.log(userSubscriptions); // See what is being filtered out
    res.json(userSubscriptions);
});





app.post('/subscribe', (req, res) => {
    const { chatId, groupId, groupName } = req.body;
    
    // Check if the user is already subscribed to the group
    const index = subscriptions.findIndex(sub => sub.chatId === chatId && sub.groupId === groupId);
    if (index === -1) {
        const newSubscription = { chatId, groupId, groupName };
        subscriptions.push(newSubscription);
        saveSubscriptions();
        
        res.json({ message: `You have subscribed to ${groupName} (Group ID: ${groupId}) messages.` });
    } else {
        res.status(409).json({ message: `You are already subscribed to ${groupName} (Group ID: ${groupId}).` });
    }
});




app.post('/unsubscribe', (req, res) => {
    const { chatId, groupId } = req.body;

    // Find the index of the subscription to remove
    const index = subscriptions.findIndex(sub => sub.chatId === chatId && sub.groupId === groupId);

    if (index !== -1) {
        const [subscription] = subscriptions.splice(index, 1); // Remove the subscription and capture it
        saveSubscriptions(); // Save the updated list of subscriptions
        res.json({ message: `You have successfully unsubscribed from ${subscription.groupName} (Group ID: ${subscription.groupId}).` });
    } else {
        res.status(404).json({ message: 'You are not currently subscribed to this group.' });
    }
});





// const sendPeriodicMessages = () => {
//     setInterval(() => {
//         // This will track if a message has been sent to a chatId in this interval
//         const notifiedChats = new Set();

//         subscriptions.forEach(async (sub) => {
//             const notificationKey = `${sub.chatId}-${sub.groupId}`;
//             if (!notifiedChats.has(notificationKey)) {
//                 try {
//                     await axios.post(`${TELEGRAM_API}/sendMessage`, {
//                         chat_id: sub.chatId,
//                         text: `Reminder: You are subscribed to "${sub.groupName}" (Group ID: ${sub.groupId}). Here's your periodic update!`,
//                         parse_mode: 'Markdown'
//                     });
//                     notifiedChats.add(notificationKey); // Mark this group as notified for this chatId
//                 } catch (error) {
//                     console.error(`Failed to send message to chat ${sub.chatId} for group ${sub.groupName}:`, error);
//                 }
//             }
//         });
//     }, 20000); // Consider adjusting the interval based on practical usage and rate limits
// };



const sendPeriodicMessages = async () => {
    setInterval(async () => {
        const notifiedChats = new Set();

        for (const sub of subscriptions) {
            const notificationKey = `${sub.chatId}-${sub.groupId}`;
            if (!notifiedChats.has(notificationKey)) {
                try {
                    const eventsData = await fetchEventById(sub.groupId);  // Assume fetchEventById is defined elsewhere

                    if (eventsData && eventsData.events && eventsData.events.length > 0) {
                        const eventDetails = eventsData.events.map(event => {
                            const startTime = new Date(event.start_time).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
                            const endTime = new Date(event.end_time).toLocaleString(undefined, { timeStyle: 'short' });
                            const location = event.location ? `at ${event.location}` : "Location TBD";

                            // Construct the event detail page URL using the event ID
                            const eventDetailUrl = `https://app.sola.day/event/detail/${event.id}`;

                            // Embedding a hyperlink in the event title using HTML
                            const titleWithLink = `<a href="${eventDetailUrl}">${event.title}</a>`;

                            return `${titleWithLink}\n${location}\nFrom: ${startTime} to ${endTime}`;
                        }).join("\n\n");

                        await axios.post(`${TELEGRAM_API}/sendMessage`, {
                            chat_id: sub.chatId,
                            text: `📅 Upcoming Events for <b>${sub.groupName}</b> (Group ID: ${sub.groupId})
                            :\n\n${eventDetails}`,
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        });

                        notifiedChats.add(notificationKey);
                    } else {
                        await axios.post(`${TELEGRAM_API}/sendMessage`, {
                            chat_id: sub.chatId,
                            text: `No upcoming events found for <b>${sub.groupName}</b> (Group ID: ${sub.groupId}).`,
                            parse_mode: 'HTML'
                        });
                    }
                } catch (error) {
                    console.error(`Failed to send message or fetch events for chat ${sub.chatId}:`, error);
                }
            }
        }
    }, 50000); // Adjust the interval as needed
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
                text: 'Get daily upadte for your interested pop-up city.',
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{
                        text: 'Subscribe here',
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
