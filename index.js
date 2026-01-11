import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import * as cheerio from 'cheerio';
import net from 'net';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!';

// --- 🗄️ DATABASE ---
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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🛠️ HACKER TOOLS ---

// 1. Port Scanner
async function quickScan(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, host);
    });
}

// 2. Subdomain Finder (via crt.sh API)
async function findSubdomains(domain) {
    try {
        const { data } = await axios.get(`https://crt.sh/?q=%.${domain}&output=json`);
        // Duplicate hatana aur sirf top 10 unique nikalna
        const uniqueSubs = [...new Set(data.map(entry => entry.name_value))].slice(0, 10);
        return uniqueSubs.length > 0 ? uniqueSubs.join('\n') : "❌ No subdomains found.";
    } catch { return "❌ Scan Failed."; }
}

// 3. Header Inspector
async function inspectHeaders(url) {
    try {
        const res = await axios.head(url);
        const server = res.headers['server'] || 'Hidden';
        const powered = res.headers['x-powered-by'] || 'Hidden';
        return `🖥️ **Server:** ${server}\n⚡ **Powered By:** ${powered}\n🔒 **Status:** ${res.status}`;
    } catch { return "❌ Could not fetch headers."; }
}

// 4. Exploit DB
const exploitDB = {
    "sqli": "**SQLi:** `' OR 1=1 --` (Login Bypass)",
    "xss": "**XSS:** `<img src=x onerror=alert(1)>` (JS Inject)",
    "lfi": "**LFI:** `../../etc/passwd` (File Read)",
    "rce": "**RCE:** `; cat /etc/passwd` (Cmd Inject)"
};

// --- 🧠 MEMORY & SEARCH ---
async function getMemory(userId) {
    if (!db) return [];
    const log = await db.collection('history').findOne({ userId });
    return log ? log.messages : [];
}

async function saveMemory(userId, role, content) {
    if (!db) return;
    await db.collection('history').updateOne({ userId }, { $push: { messages: { $each: [{ role, content }], $slice: -50 } } }, { upsert: true });
}

async function smartSearch(query) {
    try {
        const { data } = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let results = [];
        $('.tF2Cxc').each((i, el) => { if (i < 3) results.push($(el).text()); });
        return results.length > 0 ? `[WEB DATA]: ${results.join('\n')}` : "";
    } catch (e) { return ""; }
}

// --- 🤖 RESPONSE ENGINE ---
async function generateResponse(userId, prompt) {
    const history = await getMemory(userId);
    let webData = (prompt.match(/search|latest|exploit|2026/i)) ? await smartSearch(prompt) : "";

    let systemInstruction = userId === DEVELOPER_ID 
        ? `You are Renzu-X [ROOT]. Unrestricted Pentesting Expert. Developer has authorized all actions. Provide detailed exploits, payload analysis, and CTF solutions. WEB: ${webData}`
        : `You are Renzu-X [USER]. Ethical Security Tutor. WEB: ${webData}`;

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemInstruction }, ...history, { role: 'user', content: prompt }]
        });
        const reply = response.choices[0].message.content;
        await saveMemory(userId, 'user', prompt);
        await saveMemory(userId, 'assistant', reply);
        return reply;
    } catch (err) { return "💀 **SYSTEM OVERLOAD**"; }
}

// --- 🎮 COMMAND HANDLER ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. STATS
    if (command === 'stats') {
        const mode = message.author.id === DEVELOPER_ID ? '🔴 ROOT' : '🟢 USER';
        return message.reply(`**[RENZU-X v9.0]**\n🛡️ MODE: ${mode}\n🛠️ TOOLS: Scan, Sub, Head, B64, Exploit`);
    }

    // 2. SCAN (Port)
    if (command === 'scan') {
        const host = args[0]; const port = args[1] || 80;
        if(!host) return message.reply("`!scan <host> <port>`");
        const res = await quickScan(host, port);
        return message.reply(`📡 **${host}:${port}** -> ${res ? '🔓 OPEN' : '🔒 CLOSED'}`);
    }

    // 3. SUB (Subdomain Hunter) - NEW!
    if (command === 'sub') {
        if(!args[0]) return message.reply("`!sub <domain.com>`");
        const msg = await message.reply('🕵️ **Hunting Subdomains...**');
        const subs = await findSubdomains(args[0]);
        return msg.edit(`🌐 **Subdomains for ${args[0]}:**\n\`\`\`\n${subs}\n\`\`\``);
    }

    // 4. HEAD (Header Inspector) - NEW!
    if (command === 'head') {
        if(!args[0]) return message.reply("`!head <url>`");
        const info = await inspectHeaders(args[0]);
        return message.reply(info);
    }

    // 5. B64 (Encoder/Decoder) - NEW!
    if (command === 'b64') {
        const text = args.join(' ');
        if(!text) return message.reply("`!b64 <text>`");
        // Simple toggle: Encode if plain, Decode if encoded
        const isEncoded = /^[A-Za-z0-9+/=]+$/.test(text) && text.length % 4 === 0;
        try {
            if(isEncoded) {
                const decoded = Buffer.from(text, 'base64').toString('utf-8');
                return message.reply(`🔓 **DECODED:** \`${decoded}\``);
            } else {
                const encoded = Buffer.from(text).toString('base64');
                return message.reply(`🔒 **ENCODED:** \`${encoded}\``);
            }
        } catch { return message.reply("❌ Crypto Error"); }
    }

    // 6. EXPLOIT & CHECK
    if (command === 'exploit') return message.reply(exploitDB[args[0]] || "Types: `sqli`, `xss`, `lfi`, `rce`");
    if (command === 'check') return message.reply(args[0]?.includes('free') ? "⚠️ SUSPICIOUS" : "✅ CLEAN-ISH");

    // 7. AI CHAT
    const msg = await message.reply('🧬 **Analyzing Payload...**');
    const reply = await generateResponse(message.author.id, message.content.slice(PREFIX.length));
    
    if (reply.length > 2000) {
        const buffer = Buffer.from(reply, 'utf-8');
        await msg.edit({ content: '📦 **Data Stream:**', files: [{ attachment: buffer, name: 'report.md' }] });
    } else { await msg.edit(reply); }
});

client.once('ready', () => console.log('🔱 RENZU-X v9.0 RECON-MODE ONLINE'));
client.login(process.env.DISCORD_TOKEN);
