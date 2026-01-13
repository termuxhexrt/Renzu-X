import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import net from 'net';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!'; 

// --- 🗄️ DATABASE & BRAIN (Knowledge Base) ---
const uri = process.env.MONGODB_URI;
const mongoClient = uri ? new MongoClient(uri) : null;
let db, knowledgeCache = [];

async function connectDB() {
    if (!uri) return console.log('⚠️ [DB] Running on RAM mode.');
    try {
        await mongoClient.connect();
        db = mongoClient.db('renzu_database');
        const docs = await db.collection('knowledge_base').find().sort({ timestamp: -1 }).limit(10).toArray();
        knowledgeCache = docs.map(d => d.info);
        console.log('✅ [DATABASE] Memory Core Online.');
    } catch (err) { console.error('❌ [DB ERROR]', err); }
}
connectDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);
const botSessions = {}; 

// --- 🛠️ HELPER: LONG MESSAGE SPLITTER ---
async function sendLongMessage(channel, content) {
    if (content.length <= 2000) return channel.send({ content: content });
    const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: 'renzu_intel.txt' });
    return channel.send({ content: "⚠️ **INTEL OVERLOAD**: File check kar.", files: [attachment] });
}

// --- 🚀 THE ARSENAL (Converted Tools) ---
const arsenal = {
    scan: async (target) => {
        const [host, portStr] = target.replace(/https?:\/\//, '').replace('/', '').split(':');
        const port = portStr ? parseInt(portStr) : 80;
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(2500);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET ACQUIRED**: \`${host}:${port}\` is OPEN.`); });
            socket.on('error', () => { socket.destroy(); resolve(`🛡️ **CLOSED**: \`${host}\` rejected.`); });
            socket.connect(port, host);
        });
    },

    hunt: async (query) => {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:hacking&sort=stars`);
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}**\n🔗 ${i.html_url}`).join('\n\n');
        } catch (e) { return "❌ GitHub Ops Offline."; }
    },

    leak: async (url) => {
        if (!url.startsWith('http')) url = 'http://' + url;
        try {
            const res = await axios.get(`${url}/.env`, { timeout: 3000, validateStatus: () => true });
            return res.status === 200 ? `🚨 **BREACH**: .env exposed!` : `✅ **SECURE**`;
        } catch (e) { return `⚠️ Host down.`; }
    },

    createbot: async (args, isDev, userId) => {
        botSessions[userId] = { step: 1, type: args || 'General' };
        return `🏗️ **BOT ARCHITECT MODE**\n\nTarget: \`${args || 'Standard Bot'}\`\n\n**STEP 1**: Folder banao aur \`npm init -y\` chalao. Phir \`npm install discord.js dotenv\`.\n\nType \`next\`!`;
    }
};

// --- 🔄 AUTONOMOUS CRAWLER (The Loop) ---
setInterval(async () => {
    try {
        const topics = ['Zero-Day Exploit', 'RCE vulnerability 2026', 'Cyber Security News'];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const res = await axios.get(`https://api.github.com/search/repositories?q=${topic}&sort=updated`);
        const item = res.data.items[0];
        if (item && !knowledgeCache.includes(item.html_url)) {
            knowledgeCache.push(item.html_url);
            if (db) await db.collection('knowledge_base').insertOne({ info: item.html_url, timestamp: new Date() });
            console.log(`[CRAWLER] New Intel: ${item.name}`);
        }
    } catch (e) { console.log('[CRAWLER] Sleeping...'); }
}, 60000); // 1 minute loop

// --- 🗣️ COMMAND HANDLER ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isDev = message.author.id === DEVELOPER_ID;
    const content = message.content.toLowerCase();
    const userId = message.author.id;

    if (content.startsWith(PREFIX)) {
        const args = content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = args.shift();

        if (arsenal[cmd]) {
            await message.channel.sendTyping();
            const output = await arsenal[cmd](args.join(' '), isDev, userId);
            return sendLongMessage(message.channel, output);
        }
    }

    if (content === 'next' && botSessions[userId]) {
        // ... (Step logic)
        return sendLongMessage(message.channel, "📝 **STEP 2**: Paste your code now!");
    }
});

client.login(process.env.DISCORD_TOKEN);
