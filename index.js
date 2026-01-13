import 'dotenv/config';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import MistralClient from '@mistralai/mistralai';
import axios from 'axios';
import net from 'net';

const DEVELOPER_ID = '1104652354655113268';
const PREFIX = '!'; 

// --- 🗄️ SESSION TRACKER (Progress yaad rakhne ke liye) ---
const botSessions = {}; 

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

// --- 🛠️ HELPER: LONG MESSAGE SPLITTER ---
async function sendLongMessage(channel, content) {
    if (content.length <= 2000) return channel.send({ content: content });
    const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: 'renzu_intel.txt' });
    return channel.send({ content: "⚠️ **INTEL OVERLOAD**: File check kar bhai.", files: [attachment] });
}

// --- 🚀 THE ARSENAL (Modular Tools) ---
const arsenal = {
    scan: async (target) => {
        const [host, portStr] = target.replace(/https?:\/\//, '').replace('/', '').split(':');
        const port = portStr ? parseInt(portStr) : 80;
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(2500);
            socket.on('connect', () => { socket.destroy(); resolve(`💀 **TARGET ACQUIRED**: \`${host}:${port}\` is OPEN.`); });
            socket.on('error', () => { socket.destroy(); resolve(`🛡️ **CLOSED**: \`${host}\` rejected.`); });
            socket.connect(port, host);
        });
    },

    hunt: async (query) => {
        try {
            const res = await axios.get(`https://api.github.com/search/repositories?q=${query}+topic:hacking&sort=stars`);
            return res.data.items.slice(0, 3).map(i => `📦 **${i.name}**\n🔗 ${i.html_url}`).join('\n\n');
        } catch (e) { return "❌ GitHub Ops Offline."; }
    },

    // 🏗️ MOTHER TOOL: Bot Creator Start
    createbot: async (args, isDev, userId) => {
        botSessions[userId] = { step: 1, type: args || 'General' };
        return `🏗️ **RENZU BOT ARCHITECT ACTIVE**\n\nTarget: \`${args || 'Standard Bot'}\`\n\n**STEP 1: Environment Setup**\n1. Ek naya folder banao.\n2. Terminal mein likho: \`npm init -y\`\n3. Phir ye command chalao: \`npm install discord.js dotenv\`\n\nJab ye ho jaye, toh bas \`next\` likho!`;
    },

    // ➡ NEXT: Navigation Tool
    next: async (args, isDev, userId) => {
        const session = botSessions[userId];
        if (!session) return "❌ Pehle \`!createbot\` command toh chalao bhai!";

        session.step++;

        if (session.step === 2) {
            return `📝 **STEP 2: Code Generation**\n\nApni \`index.js\` file mein ye basic code paste karo:\n\n\`\`\`javascript\nimport 'dotenv/config';\nimport { Client } from 'discord.js';\nconst client = new Client({ intents: [1] });\nclient.on('ready', () => console.log('Bot Online!'));\nclient.login(process.env.TOKEN);\n\`\`\`\n\nSave karke \`next\` likho for Deployment!`;
        }

        if (session.step === 3) {
            delete botSessions[userId]; // Session clear
            return `🚀 **STEP 3: Deployment**\n\n1. Railway.app par jao aur GitHub repo connect karo.\n2. Env variables mein \`TOKEN\` add karo.\n\n**MUBARAK HO!** Tera bot tayyar hai. 🦾`;
        }
    }
};

// --- 🧠 AI CORE ---
async function generateAIResponse(prompt, isDev) {
    const systemPrompt = `Renzu-X: Elite Cyber-Weapon. Short, Direct, Hinglish.`;
    try {
        const response = await mistral.chat({
            model: 'mistral-large-latest',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
        });
        return response.choices[0].message.content;
    } catch (err) { return "⚠️ AI Core Offline."; }
}

// --- 🗣️ COMMAND HANDLER ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isDev = message.author.id === DEVELOPER_ID;
    const content = message.content.toLowerCase();
    const userId = message.author.id;

    // 1. Run Arsenal Commands (!scan, !createbot, etc.)
    if (content.startsWith(PREFIX)) {
        const args = content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = args.shift();

        if (arsenal[cmd]) {
            await message.channel.sendTyping();
            const output = await arsenal[cmd](args.join(' '), isDev, userId);
            return sendLongMessage(message.channel, output);
        }
    }

    // 2. Run 'next' logic even without prefix (if session active)
    if (content === 'next' && botSessions[userId]) {
        await message.channel.sendTyping();
        const output = await arsenal.next(null, isDev, userId);
        return sendLongMessage(message.channel, output);
    }

    // 3. AI Chat Fallback
    if (message.mentions.has(client.user) || message.content.startsWith(PREFIX)) {
        await message.channel.sendTyping();
        const reply = await generateAIResponse(message.content, isDev);
        return sendLongMessage(message.channel, reply);
    }
});

client.login(process.env.DISCORD_TOKEN);
