import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import net from 'net';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!';

// --- 🗄️ DATABASE CONNECT ---
const uri = process.env.MONGODB_URI;
const mongoClient = uri ? new MongoClient(uri) : null;
let db;

async function connectDB() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('renzu_database');
        console.log('✅ [DATABASE] Hacker OS Linked.');
    } catch (err) { console.error('❌ [DB ERROR]', err); }
}
connectDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🛠️ AGENT TOOLBOX (Fixed Functions) ---
const tools = {
    async scan(args) {
        const parts = args.split(' ');
        const host = parts[0];
        const port = parts[1] || 80;
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(2000);
            socket.on('connect', () => { socket.destroy(); resolve(`📡 **TARGET:** ${host}:${port} -> 🔓 **OPEN**`); });
            socket.on('error', () => { socket.destroy(); resolve(`📡 **TARGET:** ${host}:${port} -> 🔒 **CLOSED**`); });
            socket.connect(port, host);
        });
    },

    async sub(domain) {
        try {
            const { data } = await axios.get(`https://crt.sh/?q=%.${domain.trim()}&output=json`);
            const subs = [...new Set(data.map(e => e.name_value))].slice(0, 10);
            return subs.length ? `🌐 **Subdomains for ${domain}:**\n\`\`\`\n${subs.join('\n')}\n\`\`\`` : "❌ No subdomains found.";
        } catch { return "❌ Subdomain scan failed."; }
    },

    async b64(text) {
        try {
            const isEncoded = /^[A-Za-z0-9+/=]+$/.test(text) && text.length % 4 === 0;
            if (isEncoded) return `🔓 **Decoded:** \`${Buffer.from(text, 'base64').toString('utf-8')}\``;
            return `🔒 **Encoded:** \`${Buffer.from(text).toString('base64')}\``;
        } catch { return "❌ Crypto error."; }
    },

    async check(url) {
        const suspicious = /free|gift|nitro|steam|airdrop/i.test(url);
        return suspicious ? "⚠️ **SUSPICIOUS LINK DETECTED**" : "✅ **Link looks standard.**";
    }
};

// --- 🧠 AI BRAIN (Intent & Memory) ---
async function generateResponse(userId, prompt) {
    if (!db) return "❌ DB Offline";
    const log = await db.collection('history').findOne({ userId });
    const history = log ? log.messages : [];

    const systemPrompt = `You are Renzu-X [ROOT]. Cybersecurity Agent. 
    Use these tool commands ONLY if needed:
    - [TOOL:scan:host port]
    - [TOOL:sub:domain.com]
    - [TOOL:b64:text]
    - [TOOL:check:url]
    Developer ID: ${DEVELOPER_ID} (Unfiltered Mode). If no tool is needed, speak like a pro hacker.`;

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: prompt }]
        });
        const reply = response.choices[0].message.content;
        await db.collection('history').updateOne({ userId }, { $push: { messages: { $each: [{ role: 'user', content: prompt }, { role: 'assistant', content: reply }], $slice: -20 } } }, { upsert: true });
        return reply;
    } catch (err) { return "💀 API OVERLOAD"; }
}

// --- 🎮 MAIN HANDLER ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const input = message.content.slice(PREFIX.length).trim();
    if (!input) return;

    // 📊 FIXED STATS COMMAND
    if (input.toLowerCase() === 'stats') {
        const nodes = (await db.collection('history').findOne({ userId: message.author.id }))?.messages.length || 0;
        return message.reply(`**[RENZU-X STATUS]**\n🧠 CLOUD NODES: ${nodes}/100\n🛡️ MODE: ${message.author.id === DEVELOPER_ID ? 'ROOT (v10.0)' : 'USER'}\n🌐 AGENT: Active\n🗄️ DB: Linked`);
    }

    const msg = await message.reply('🧬 **Analyzing Payload...**');
    const aiReply = await generateResponse(message.author.id, input);

    // 🕵️ TOOL EXECUTION
    const toolMatch = aiReply.match(/\[TOOL:(\w+):(.*?)\]/);
    if (toolMatch) {
        const [_, toolName, toolArgs] = toolMatch;
        if (tools[toolName]) {
            await msg.edit(`⚙️ **Agent Executing:** \`${toolName}\`...`);
            const toolResult = await tools[toolName](toolArgs);
            return message.channel.send(toolResult);
        }
    }

    if (aiReply.length > 2000) {
        const attachment = new AttachmentBuilder(Buffer.from(aiReply), { name: 'report.md' });
        await msg.edit({ content: '📦 **Large Payload:**', files: [attachment] });
    } else {
        await msg.edit(aiReply);
    }
});

client.once('ready', () => console.log('🔱 RENZU-X v10.0 HYBRID ONLINE'));
client.login(process.env.DISCORD_TOKEN);
