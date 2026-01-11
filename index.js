import { getVoiceConnection } from '@discordjs/voice';
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import gTTS from 'gtts';
import fs from 'fs';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!';

// --- 🗄️ MONGODB CONNECT ---
const uri = process.env.MONGODB_URI;
if (!uri) console.error("❌ ERROR: MONGODB_URI is not defined!");
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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Voice ke liye zaruri
    ]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🎙️ UNLIMITED FREE VOICE ENGINE (gTTS) ---
// Isse replace karo apne purane speakInVC function ko
async function speakInVC(connection, text) {
    try {
        const filePath = '/tmp/voice.mp3';
        const gtts = new gTTS(text, 'hi');
        
        gtts.save(filePath, async (err) => {
            if (err) return console.log("❌ Voice Save Error:", err);

            const player = createAudioPlayer();
            const resource = createAudioResource(filePath, { 
                inlineVolume: true 
            });

            player.play(resource);
            connection.subscribe(player);
            
            console.log("🔊 Playing voice in VC...");

            // Player error check
            player.on('error', error => {
                console.error('❌ Audio Player Error:', error.message);
            });
        });
    } catch (e) {
        console.error("❌ speakInVC Crash:", e);
    }
}
// --- 🧠 AI GENERATOR SELECTOR ---
async function autoSelectGenerator(prompt) {
    try {
        const res = await mistral.chat({
            model: 'mistral-medium',
            messages: [{ role: 'system', content: `Analyze: "${prompt}". Return ONLY the slug of the best Perchance generator from this list: 'ai-text-to-image-generator', 'anime-instance-generator', 'cyberpunk-city-generator'. No extra text.` }]
        });
        return res.choices[0].message.content.trim().replace(/'/g, "");
    } catch { return 'ai-text-to-image-generator'; }
}

// --- 🗄️ MEMORY & SEARCH (TERA OLD LOGIC) ---
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
        if (results.length > 0) return `[SCRAPE DATA]: ${results.join('\n')}`;
    } catch (e) { }
    try {
        const resp = await axios.post('https://google.serper.dev/search', { q: query }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' } });
        return `[SERPER DATA]: ${resp.data.organic.map(r => r.snippet).join('\n')}`;
    } catch (e) { return "Search failed."; }
}

// --- 🤖 RESPONSE ENGINE ---
async function generateResponse(userId, prompt, isVoice = false) {
    const history = await getMemory(userId);
    let webData = (prompt.match(/search|latest|exploit|2026/i)) ? await smartSearch(prompt) : "";

    const monsterInstruction = `You are Renzu-X v6.5. Hybrid AI with Voice & Search. Database: MongoDB. Access: ${userId === DEVELOPER_ID ? 'ROOT' : 'USER'}. WEB: ${webData}`;

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: monsterInstruction }, ...history, { role: 'user', content: prompt }]
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

    // 1. STATS (Tera Old Command)
    if (input.startsWith('stats')) {
        const nodes = (await getMemory(message.author.id)).length;
        return message.reply(`**[RENZU-X STATUS]**\n🧠 CLOUD NODES: ${nodes}/100\n🎙️ VOICE: Ready\n🎨 DRAW: Auto-Perchance\n🗄️ DB: Linked`);
    }
// 2. VOICE JOIN
    if (input.toLowerCase() === 'join') {
        const channel = message.member.voice.channel;
        if (!channel) return message.reply("Bhai VC mein toh aao!");
        
        const connection = joinVoiceChannel({ 
            channelId: channel.id, 
            guildId: message.guild.id, 
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: false,  // Isse bot ke kaan khul jayenge (Deafened hatega)
            selfMute: false,  // Isse bot mute nahi rahega
            group: client.user.id
        });

        await message.reply("🎙️ **Joined VC.** Main sun raha hoon!");
        
        // Thoda delay dena zaruri hai taaki connection stable ho jaye
        setTimeout(() => {
            speakInVC(connection, "System Online. Main voice channel mein aa gaya hoon.");
        }, 1500); 
        
        return;
    }
    // 3. DRAW (Autonomous)
    if (input.startsWith('draw ')) {
        const prompt = input.replace('draw ', '');
        const waitMsg = await message.reply('🧠 **AI Selecting Model...**');
        const bestSlug = await autoSelectGenerator(prompt);
        const imgUrl = `https://perchance.org/api/downloadImage?generator=${bestSlug}&prompt=${encodeURIComponent(prompt)}`;
        return await waitMsg.edit({ content: `🎨 **Generated via ${bestSlug}**`, files: [imgUrl] });
    }

   // 4. SMART CHAT (Final Fix for Voice)
    const msg = await message.reply('🧬 **Processing...**');
    const reply = await generateResponse(message.author.id, input);
    
    // Sabse pehle text reply bhej do
    if (reply.length > 2000) {
        const buffer = Buffer.from(reply, 'utf-8');
        await msg.edit({ content: '📦 **Payload:**', files: [{ attachment: buffer, name: 'report.md' }] });
    } else { 
        await msg.edit(reply); 
    }

    // AB VOICE TRIGER KARO
    const connection = getVoiceConnection(message.guild.id);
    if (connection && message.member.voice.channelId === message.guild.members.me.voice.channelId) {
        console.log("🔊 Speaking in VC now...");
        // Clean text for TTS (remove emojis/symbols for better sound)
        const cleanReply = reply.slice(0, 200).replace(/[#*`_]/g, '');
        speakInVC(connection, cleanReply); 
    }
}); // <--- Bracket close

client.once('ready', () => console.log('🔱 RENZU-X v6.5 ONLINE'));
client.login(process.env.DISCORD_TOKEN);
