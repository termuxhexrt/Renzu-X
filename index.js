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
            socket.on('connect', () => { socket.destroy(); resolve(`📡 TARGET: ${host}:${port} -> STATUS: OPEN`); });
            socket.on('error', () => { socket.destroy(); resolve(`📡 TARGET: ${host}:${port} -> STATUS: CLOSED`); });
            socket.connect(port, host);
        });
    },

    async sub(domain) {
        try {
            const { data } = await axios.get(`https://crt.sh/?q=%.${domain.trim()}&output=json`);
            const subs = [...new Set(data.map(e => e.name_value))].slice(0, 10);
            return subs.length ? `🌐 Subdomains: ${subs.join(', ')}` : "❌ No subdomains found.";
        } catch { return "❌ Subdomain scan failed."; }
    },

    async b64(text) {
        try {
            const isEncoded = /^[A-Za-z0-9+/=]+$/.test(text) && text.length % 4 === 0;
            if (isEncoded) return `🔓 Decoded: ${Buffer.from(text, 'base64').toString('utf-8')}`;
            return `🔒 Encoded: ${Buffer.from(text).toString('base64')}`;
        } catch { return "❌ Crypto error."; }
    },

    async check(url) {
        const suspicious = /free|gift|nitro|steam|airdrop/i.test(url);
        return suspicious ? "⚠️ ALERT: Phishing pattern detected." : "✅ SAFE: No obvious threats found.";
    }
};

// --- 🧠 AI BRAIN (Updated for The Loop) ---
async function generateResponse(userId, prompt, toolResult = null) {
    if (!db) return "❌ DB Offline";
    const log = await db.collection('history').findOne({ userId });
    const history = log ? log.messages : [];

    let systemPrompt;
    if (toolResult) {
        // Step 2: Analysis Mode (Loop)
        systemPrompt = `You are Renzu-X [ROOT]. I have executed a tool. 
        TOOL_DATA: ${toolResult}
        User's Request: ${prompt}
        Analyze this data and explain it in a cool, professional hacker tone. 
        Don't just repeat the data, give insights or warnings.`;
    } else {
        // Step 1: Decision Mode
        systemPrompt = `You are Renzu-X [ROOT]. Cybersecurity Agent. 
        Tools: [TOOL:scan:host port], [TOOL:sub:domain.com], [TOOL:b64:text], [TOOL:check:url].
        If a tool is needed, respond ONLY with the tool command. 
        If no tool is needed, respond as a pro-hacker. Developer ID: ${DEVELOPER_ID}.`;
    }

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: prompt }]
        });
        const reply = response.choices[0].message.content;
        
        // Save history only for non-tool intermediate responses
        if (!reply.startsWith('[TOOL:')) {
            await db.collection('history').updateOne({ userId }, { $push: { messages: { $each: [{ role: 'user', content: prompt }, { role: 'assistant', content: reply }], $slice: -20 } } }, { upsert: true });
        }
        return reply;
    } catch (err) { return "💀 API OVERLOAD"; }
}

// --- 🎮 MAIN HANDLER (Optimized for Speed) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const input = message.content.slice(PREFIX.length).trim();
    if (!input) return;

    // ⚡ INSTANT RESPONSE: AI ke paas bhejne se pehle hi check karlo
    if (input.toLowerCase().includes('stats')) {
        const nodes = (await db.collection('history').findOne({ userId: message.author.id }))?.messages.length || 0;
        return message.reply(`**[RENZU-X STATUS]**\n🧠 CLOUD NODES: ${nodes}/100\n🛡️ MODE: ROOT (v11.5)\n⚡ SPEED: Optimized\n🗄️ DB: Linked`);
    }

    const msg = await message.reply('🧬 **Mistral Thinking...**');
    
    // Pass 1: Initial Thought
    let aiReply = await generateResponse(message.author.id, input);

    // 🕵️ TOOL DETECTION
    const toolMatch = aiReply.match(/\[TOOL:(\w+):(.*?)\]/);
    if (toolMatch) {
        const [_, toolName, toolArgs] = toolMatch;
        if (tools[toolName]) {
            await msg.edit(`⚙️ **Agent Executing:** \`${toolName}\`...`);
            const toolOutput = await tools[toolName](toolArgs);

            // Pass 2: Final Analysis (The Loop)
            await msg.edit('🧠 **Finalizing Analysis...**');
            const finalAnalysis = await generateResponse(message.author.id, input, toolOutput);
            
            return msg.edit(finalAnalysis);
        }
    }

    // Normal AI Response (If no tool needed)
    if (aiReply.length > 2000) {
        const attachment = new AttachmentBuilder(Buffer.from(aiReply), { name: 'report.md' });
        await msg.edit({ content: '📦 **Large Payload:**', files: [attachment] });
    } else {
        await msg.edit(aiReply);
    }
});

client.once('ready', () => console.log('🔱 RENZU-X v11.0 AGENTIC LOOP ONLINE'));
client.login(process.env.DISCORD_TOKEN);
