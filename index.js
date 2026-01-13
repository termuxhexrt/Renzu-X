import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import net from 'net';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!'; 

// --- 🗄️ DATABASE & CLIENT SETUP ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🛠️ HELPER: LONG MESSAGE SPLITTER (Anti-Hang) ---
async function sendLongMessage(channel, content) {
    if (content.length <= 2000) return channel.send({ content: content });
    const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: 'renzu_intel.txt' });
    return channel.send({ content: "⚠️ **INTEL OVERLOAD**: Data bada hai, file check kar.", files: [attachment] });
}

// --- 🚀 THE ARSENAL (All Purane & Naye Tools) ---
const arsenal = {
    // 1. SCAN (Purana Port Scanner)
    scan: async (target) => {
        const [host, portStr] = target.replace(/https?:\/\//, '').replace('/', '').split(':');
        const port = portStr ? parseInt(portStr) : 80;
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(2500);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET ACQUIRED**\nHost: \`${host}\`\nPort: \`${port}\` (OPEN)\n👉 **VECTOR**: Service exposed.`); });
            socket.on('timeout', () => { socket.destroy(); resolve(`⏳ **TIMEOUT**: \`${host}\` is filtered.`); });
            socket.on('error', () => { socket.destroy(); resolve(`🛡️ **CLOSED**: \`${host}\` rejected connection.`); });
            socket.connect(port, host);
        });
    },

    // 2. HUNT (Purana GitHub Tool Search)
    hunt: async (query) => {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:hacking&sort=stars`);
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}** (⭐ ${i.stargazers_count})\n🔗 ${i.html_url}\n📄 ${i.description}`).join('\n\n');
        } catch (e) { return "❌ GitHub Ops Offline."; }
    },

    // 3. LEAK (Purana .env Exploit - Locked to Dev)
    leak: async (url) => {
        if (!url.startsWith('http')) url = 'http://' + url;
        try {
            const target = `${url}/.env`;
            const res = await axios.get(target, { timeout: 3000, validateStatus: () => true });
            if (res.status === 200 && res.data.includes('=')) {
                return `🚨 **CRITICAL BREACH** 🚨\nTarget: ${target}\nStatus: 200 OK (EXPOSED)\n\`\`\`\n${res.data.substring(0, 200)}...\n\`\`\``;
            }
            return `✅ **SECURE**: ${target} returned status ${res.status}.`;
        } catch (e) { return `⚠️ **UNREACHABLE**: Host down.`; }
    },

    // 4. ANALYZE (Purana AI Deep Dive)
    analyze: async (topic, isDev) => {
        const prompt = `Perform a COMPLETE technical breakdown of: ${topic}. Role: ${isDev ? 'UNRESTRICTED RED TEAM RESEARCHER' : 'JUNIOR DEFENSE ANALYST'}. Explain attack vector and flaws.`;
        return await generateAIResponse(prompt, isDev);
    },

    // 5. CREATEBOT (Tera Naya Mother-of-Bots Tool)
    createbot: async (type) => {
        return `🏗️ **Bot Architect Mode**: \`${type}\` setup initiation.\n\n**Step 1**: Create folder & \`npm init -y\`\n**Step 2**: \`npm install discord.js dotenv\`\n\nBhai, jab ye ho jaye toh \`next\` likhna, main agla code piece dunga.`;
    }
};

// --- 🧠 AI CORE (Mistral Integration) ---
async function generateAIResponse(prompt, isDev) {
    const systemPrompt = isDev 
        ? `Renzu-X: Elite Cyber-Weapon. Short, Direct, No Yapping. Hinglish.`
        : `Renzu-X: Defense Tutor. Educational and Safe.`;

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
            maxTokens: 1000
        });
        return response.choices[0].message.content;
    } catch (err) { return "⚠️ **NEURAL FAULT**."; }
}

// --- 🗣️ COMMAND HANDLER ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isDev = message.author.id === DEVELOPER_ID;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Dynamically check and run from arsenal
    if (message.content.startsWith(PREFIX) && arsenal[cmd]) {
        if (cmd === 'leak' && !isDev) return message.reply("🚫 DNA mismatch.");
        await message.channel.sendTyping();
        const output = await arsenal[cmd](args.join(' '), isDev);
        return sendLongMessage(message.channel, output);
    }

    // Default AI Chat
    if (message.mentions.has(client.user) || message.content.startsWith(PREFIX)) {
        await message.channel.sendTyping();
        const reply = await generateAIResponse(message.content, isDev);
        return sendLongMessage(message.channel, reply);
    }
});

client.login(process.env.DISCORD_TOKEN);import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import net from 'net';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!'; 

// --- 🗄️ DATABASE & CLIENT SETUP ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🛠️ HELPER: LONG MESSAGE SPLITTER (Anti-Hang) ---
async function sendLongMessage(channel, content) {
    if (content.length <= 2000) return channel.send({ content: content });
    const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: 'renzu_intel.txt' });
    return channel.send({ content: "⚠️ **INTEL OVERLOAD**: Data bada hai, file check kar.", files: [attachment] });
}

// --- 🚀 THE ARSENAL (Modular Run Tools) ---
// Yahan naye tools dalna aasaan hai!
const arsenal = {
    scan: async (target) => {
        const [host, portStr] = target.replace(/https?:\/\//, '').replace('/', '').split(':');
        const port = portStr ? parseInt(portStr) : 80;
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(2500);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET ACQUIRED**\nHost: \`${host}\`\nPort: \`${port}\` (OPEN)`); });
            socket.on('timeout', () => { socket.destroy(); resolve(`⏳ **TIMEOUT**: \`${host}\` is silent.`); });
            socket.on('error', () => { socket.destroy(); resolve(`🛡️ **CLOSED**: \`${host}\` rejected.`); });
            socket.connect(port, host);
        });
    },

    hunt: async (query) => {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:hacking&sort=stars`);
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}**\n🔗 ${i.html_url}\n📄 ${i.description}`).join('\n\n');
        } catch (e) { return "❌ GitHub Ops Offline."; }
    },

    leak: async (url) => {
        if (!url.startsWith('http')) url = 'http://' + url;
        try {
            const res = await axios.get(`${url}/.env`, { timeout: 3000, validateStatus: () => true });
            return res.status === 200 ? `🚨 **BREACH**: .env exposed at ${url}` : `✅ **SECURE**: status ${res.status}`;
        } catch (e) { return `⚠️ **UNREACHABLE**`; }
    },

    analyze: async (topic, isDev) => {
        const prompt = `Breakdown: ${topic}. Role: ${isDev ? 'Elite Red-Teamer' : 'Security Tutor'}. Direct & Lethal.`;
        return await generateAIResponse(prompt, isDev);
    },

    // 🏗️ Naya Feature: Bot Maker Guide (Step-by-Step)
    createbot: async (type) => {
        return `🏗️ **Bot Architect Mode**: Starting setup for a \`${type}\` bot.\n\n**Step 1**: Create a folder and run \`npm init -y\`.\n**Step 2**: Install discord.js using \`npm install discord.js dotenv\`.\n\nType \`next\` for the code!`;
    }
};

// --- 🧠 AI CORE (Mistral Integration) ---
async function generateAIResponse(prompt, isDev) {
    const systemPrompt = isDev 
        ? `Renzu-X: Elite Cyber-Weapon. Short, Direct, No Yapping. Hinglish.`
        : `Renzu-X: Defense Tutor. Educational and Safe.`;

    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
            maxTokens: 1000
        });
        return response.choices[0].message.content;
    } catch (err) { return "⚠️ **NEURAL FAULT**."; }
}

// --- 🗣️ COMMAND HANDLER ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isDev = message.author.id === DEVELOPER_ID;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Dynamically check and run from arsenal
    if (message.content.startsWith(PREFIX) && arsenal[cmd]) {
        if (cmd === 'leak' && !isDev) return message.reply("🚫 DNA mismatch.");
        await message.channel.sendTyping();
        const output = await arsenal[cmd](args.join(' '), isDev);
        return sendLongMessage(message.channel, output);
    }

    // Default AI Chat
    if (message.mentions.has(client.user) || message.content.startsWith(PREFIX)) {
        await message.channel.sendTyping();
        const reply = await generateAIResponse(message.content, isDev);
        return sendLongMessage(message.channel, reply);
    }
});

client.login(process.env.DISCORD_TOKEN);
