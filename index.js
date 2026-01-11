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
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🗄️ MEMORY & SEARCH ---
async function getMemory(userId) {
    if (!db) return [];
    const col = db.collection('history');
    const log = await col.findOne({ userId });
    return log ? log.messages : [];
}

async function saveMemory(userId, role, content) {
    if (!db) return;
    const col = db.collection('history');
    await col.updateOne({ userId }, { $push: { messages: { $each: [{ role, content }], $slice: -100 } } }, { upsert: true });
}

async function smartSearch(query) {
    try {
        const { data } = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let results = [];
        $('.tF2Cxc').each((i, el) => { if (i < 2) results.push($(el).text()); });
        return results.length > 0 ? `[SEARCH DATA]: ${results.join('\n')}` : "";
    } catch (e) { return ""; }
}

// --- 🤖 RESPONSE ENGINE ---
async function generateResponse(userId, prompt) {
    const history = await getMemory(userId);
    let webData = (prompt.match(/search|latest|2026/i)) ? await smartSearch(prompt) : "";

    const systemInstruction = `You are Renzu-X v7.0. A specialized Cyber Security AI. Access: ${userId === DEVELOPER_ID ? 'ROOT' : 'USER'}. WEB: ${webData}. Response: Short & Deadly.`;

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
    const input = message.content.slice(PREFIX.length).trim();

    if (input.startsWith('stats')) {
        const nodes = (await getMemory(message.author.id)).length;
        return message.reply(`**[RENZU-X STATUS]**\n🧠 CLOUD NODES: ${nodes}/100\n🌐 MODE: Text-Only (v7.0)\n🗄️ DB: Linked`);
    }

    const msg = await message.reply('🧬 **Processing...**');
    const reply = await generateResponse(message.author.id, input);

    if (reply.length > 2000) {
        const buffer = Buffer.from(reply, 'utf-8');
        await msg.edit({ content: '📦 **Payload too large, sent as file:**', files: [{ attachment: buffer, name: 'report.md' }] });
    } else { 
        await msg.edit(reply); 
    }
});

client.once('ready', () => console.log('🔱 RENZU-X v7.0 TEXT-MODE ONLINE'));
client.login(process.env.DISCORD_TOKEN);
