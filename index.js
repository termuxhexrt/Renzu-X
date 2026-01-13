import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder, Events } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import net from 'net';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!'; 

// --- 🗄️ DATABASE & BRAIN ---
const uri = process.env.MONGODB_URI;
const mongoClient = uri ? new MongoClient(uri) : null;
let db, knowledgeCache = [];

async function connectDB() {
    if (!uri) return console.log('⚠️ [DB] No URI. RAM Mode active.');
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
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);
const botSessions = {}; 

// --- 🛠️ HELPER: LONG MESSAGE SPLITTER (Anti-Hang) ---
async function sendLongMessage(target, content) {
    const isInteraction = target.editReply !== undefined;
    if (content.length <= 2000) {
        return isInteraction ? target.editReply({ content: content }) : target.send({ content: content });
    }
    const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: 'renzu_intel.txt' });
    const msg = { content: "⚠️ **INTEL OVERLOAD**: Data bada hai, file check kar.", files: [attachment] };
    return isInteraction ? target.editReply(msg) : target.send(msg);
}

// --- 🧠 AI CORE ---
async function generateAIResponse(prompt, isDev) {
    const systemPrompt = isDev 
        ? `Renzu-X: Elite Cyber-Weapon. Short, Direct, Hinglish. User: Commander.`
        : `Renzu-X: Security Tutor. Educational, Safe, Hinglish.`;

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
        });
        return response.choices[0].message.content;
    } catch (err) { return "⚠️ **NEURAL FAULT**: AI Core down."; }
}

// --- 🚀 THE ARSENAL (Modular Tools) ---
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
    createbot: async (type, isDev, userId) => {
        botSessions[userId] = { step: 1, type };
        return `🏗️ **BOT ARCHITECT**: \`${type}\` setup.\n\n**STEP 1**: Folder banao & \`npm init -y\`. Phir \`npm install discord.js dotenv\`.\n\nType \`next\` for code!`;
    }
};

// --- 🔄 CRAWLER LOOP ---
setInterval(async () => {
    try {
        const res = await axios.get(`https://api.github.com/search/repositories?q=exploit&sort=updated`);
        const item = res.data.items[0];
        if (item && !knowledgeCache.includes(item.html_url)) {
            knowledgeCache.push(item.html_url);
            if (db) await db.collection('knowledge_base').insertOne({ info: item.html_url, timestamp: new Date() });
        }
    } catch (e) {}
}, 60000);

// --- 🗣️ COMMAND HANDLERS ---

// 1. Slash Commands Handler
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();
    const isDev = interaction.user.id === DEVELOPER_ID;
    
    let output;
    if (interaction.commandName === 'ask') {
        output = await generateAIResponse(interaction.options.getString('query'), isDev);
    } else if (arsenal[interaction.commandName]) {
        const input = interaction.options.getString('target') || interaction.options.getString('query') || interaction.options.getString('topic');
        output = await arsenal[interaction.commandName](input, isDev, interaction.user.id);
    }
    await sendLongMessage(interaction, output);
});

// 2. Prefix & Message Handler
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    const isDev = message.author.id === DEVELOPER_ID;
    const content = message.content.toLowerCase();

    // Next Step Logic
    if (content === 'next' && botSessions[message.author.id]) {
        return message.reply("📝 **STEP 2**: Code paste karo: `import { Client } from 'discord.js';`...");
    }

    // Prefix Commands
    if (content.startsWith(PREFIX)) {
        const args = content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = args.shift();
        if (arsenal[cmd]) {
            await message.channel.sendTyping();
            const res = await arsenal[cmd](args.join(' '), isDev, message.author.id);
            return sendLongMessage(message.channel, res);
        }
        // AI Chat fallback
        await message.channel.sendTyping();
        const reply = await generateAIResponse(message.content.slice(PREFIX.length), isDev);
        return sendLongMessage(message.channel, reply);
    }
});

client.once('ready', () => console.log(`🚀 ${client.user.tag} IS ARMED.`));
client.login(process.env.DISCORD_TOKEN);
