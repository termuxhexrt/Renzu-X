import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
    // --- 🔥 MAIN AI COMMANDS (Tool-Based) ---
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask Renzu-X anything - AI will automatically use the right tools')
        .addStringOption(o => o.setName('query').setDescription('Your question or command').setRequired(true)),

    // --- 🛠️ DIRECT TOOL COMMANDS ---
    new SlashCommandBuilder()
        .setName('scan')
        .setDescription('Scan host and port (or use /ask "scan google.com:443")')
        .addStringOption(o => o.setName('target').setDescription('host:port or host').setRequired(true)),

    new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Search GitHub for security tools (or use /ask "hunt SQL injection")')
        .addStringOption(o => o.setName('query').setDescription('Search query').setRequired(true)),

    new SlashCommandBuilder()
        .setName('analyze')
        .setDescription('Deep AI analysis of security topic (or use /ask "analyze buffer overflow")')
        .addStringOption(o => o.setName('topic').setDescription('Topic to analyze').setRequired(true)),

    // --- 🔬 REVERSE ENGINEERING ---
    new SlashCommandBuilder()
        .setName('reverse')
        .setDescription('Reverse engineering tasks (or use /ask with file attachment)')
        .addStringOption(o => o.setName('task').setDescription('What to do: extract strings, analyze binary, explain assembly').setRequired(true)),

    // --- 🔐 ENCODING/DECODING ---
    new SlashCommandBuilder()
        .setName('encode')
        .setDescription('Encode text (base64, hex, etc)')
        .addStringOption(o => o.setName('type').setDescription('base64, hex').setRequired(true))
        .addStringOption(o => o.setName('text').setDescription('Text to encode').setRequired(true)),

    new SlashCommandBuilder()
        .setName('decode')
        .setDescription('Decode text (base64, hex, etc)')
        .addStringOption(o => o.setName('type').setDescription('base64, hex').setRequired(true))
        .addStringOption(o => o.setName('data').setDescription('Data to decode').setRequired(true)),

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[DEPLOY] Refreshing ${commands.length} application commands...`);
        
        // Use applicationGuildCommands for instant updates (guild-specific)
        // Or use applicationCommands for global (takes up to 1 hour)
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log('[DEPLOY] ✅ Success! Commands registered to your server (Guild).');
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log('[DEPLOY] ✅ Success! Commands registered globally (may take up to 1 hour).');
        }
    } catch (error) {
        console.error('[DEPLOY] ❌ Error:', error);
    }
})();
