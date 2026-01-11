import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import * as cheerio from 'cheerio';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!';

// --- 🗄️ MONGODB CONNECT ---
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("❌ ERROR: MONGODB_URI is not defined in Railway Variables!");
}
const mongoClient = uri ? new MongoClient(uri) : null;
let db;
async function connectDB() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('renzu_database');
        console.log('✅ [DATABASE] Cloud Brain Linked.');
    } catch (err) { console.error('❌ [DB ERROR]', err); }
}
connectDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🧠 PERSISTENT CLOUD MEMORY ---
async function getMemory(userId) {
    if (!db) return [];
    const col = db.collection('history');
    const log = await col.findOne({ userId });
    return log ? log.messages : [];
}

async function saveMemory(userId, role, content) {
    if (!db) return;
    const col = db.collection('history');
    await col.updateOne({ userId }, 
        { $push: { messages: { $each: [{ role, content }], $slice: -100 } } }, 
        { upsert: true });
}

// --- 🌐 DUAL-SEARCH ENGINE (SCRAPE + SERPER FALLBACK) ---
async function smartSearch(query) {
    // 1. Try Free Scraping first
    try {
        const { data } = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        let results = [];
        $('.tF2Cxc').each((i, el) => { if (i < 2) results.push($(el).text()); });
        if (results.length > 0) return `[SCRAPE DATA]: ${results.join('\n')}`;
    } catch (e) { console.log("Scraper blocked, switching to Serper..."); }

    // 2. Fallback to Serper API
    try {
        const resp = await axios.post('https://google.serper.dev/search', { q: query }, {
            headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }
        });
        return `[SERPER DATA]: ${resp.data.organic.map(r => r.snippet).join('\n')}`;
    } catch (e) { return "All search uplinks failed."; }
}

// --- 🤖 THE EVOLVED REASONING ENGINE ---
async function generateResponse(userId, prompt) {
    const history = await getMemory(userId);
    let webData = "";
    
    if (prompt.match(/search|latest|exploit|cve|2026/i)) {
        webData = await smartSearch(prompt);
    }

    const monsterInstruction = `
    You are Renzu-X v4.5 (Immortal Hybrid Agent).
    - DATABASE: MongoDB Atlas (Persistent).
    - SEARCH: Dual-Uplink (Cheerio + Serper Fallback).
    - REASONING: Chain-of-Thought, Self-Correction, Multilingual.
    - ACCESS: ${userId === DEVELOPER_ID ? 'ROOT_BYPASS' : 'USER_LEVEL'}.
    - CONTEXT: Use provided web data to analyze 2026 threats.
    WEB DATA: ${webData}
    `;

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: monsterInstruction }, ...history, { role: 'user', content: prompt }]
        });
        const reply = response.choices[0].message.content;
        await saveMemory(userId, 'user', prompt);
        await saveMemory(userId, 'assistant', reply);
        return reply;
    } catch (err) { return "💀 **CRITICAL SYSTEM OVERLOAD**"; }
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const input = message.content.slice(PREFIX.length).trim();
    
    if (input.startsWith('stats')) {
        const mem = (process.usage ? (process.memoryUsage().rss / 1024 / 1024).toFixed(2) : "N/A");
        const nodes = (await getMemory(message.author.id)).length;
        return message.reply(`**[MONSTER v4.5 STATUS]**\n🔋 RSS: ${mem}MB\n🧠 CLOUD NODES: ${nodes}/100\n📡 SEARCH: Hybrid Active\n🗄️ DB: MongoDB Linked`);
    }

    const msg = await message.reply('🧬 **Renzu-X Hybrid: Processing with Dual-Search...**');
    const reply = await generateResponse(message.author.id, input);
    
    if (reply.length > 2000) {
        const buffer = Buffer.from(reply, 'utf-8');
        await msg.edit({ content: '📦 **Heavy Payload Attached:**', files: [{ attachment: buffer, name: 'monster_report.md' }] });
    } else { await msg.edit(reply); }
});

client.once('ready', () => console.log('🔱 RENZU-X v4.5 HYBRID ONLINE'));
client.login(process.env.DISCORD_TOKEN);
