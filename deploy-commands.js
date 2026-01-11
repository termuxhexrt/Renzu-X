import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

// Helper to create basic string option
const strOpt = (builder, name, desc) => 
    builder.addStringOption(option => option.setName(name).setDescription(desc).setRequired(true));

const commands = [
    // --- OFFENSIVE & RED TEAMING ---
    new SlashCommandBuilder().setName('xploit-search').setDescription('Search CVE/ExploitDB').addStringOption(o => o.setName('service').setDescription('Target Service').setRequired(true)),
    new SlashCommandBuilder().setName('payload-gen').setDescription('Generate Attack Payloads').addStringOption(o => o.setName('vector').setDescription('SQLi, XSS, SSTI, etc').setRequired(true)),
    new SlashCommandBuilder().setName('dork-maker').setDescription('Generate Google Dorks').addStringOption(o => o.setName('target').setDescription('Target Domain').setRequired(true)),
    new SlashCommandBuilder().setName('bypass-check').setDescription('WAF Bypass Tech').addStringOption(o => o.setName('waf').setDescription('WAF Name').setRequired(true)),
    new SlashCommandBuilder().setName('shell-gen').setDescription('Reverse Shell Generator').addStringOption(o => o.setName('ip').setDescription('LHOST').setRequired(true)).addStringOption(o => o.setName('port').setDescription('LPORT').setRequired(true)),
    new SlashCommandBuilder().setName('wordlist-gen').setDescription('Custom Wordlist Creator').addStringOption(o => o.setName('seeds').setDescription('Keywords (comma sep)').setRequired(true)),

    // --- AUTOMATION ---
    new SlashCommandBuilder().setName('port-scanner').setDescription('Generate Python Port Scanner'),
    new SlashCommandBuilder().setName('brute-force-gen').setDescription('Generate Brute Force Script'),
    new SlashCommandBuilder().setName('dir-buster').setDescription('Generate Directory Buster'),
    new SlashCommandBuilder().setName('packet-sniffer').setDescription('Generate Packet Sniffer'),
    new SlashCommandBuilder().setName('sub-enum').setDescription('Generate Subdomain Enum Tool'),
    new SlashCommandBuilder().setName('keylog-sim').setDescription('Generate Educational Keylogger'),

    // --- OSINT ---
    new SlashCommandBuilder().setName('ip-trace').setDescription('IP Geolocation & ASN Analysis').addStringOption(o => o.setName('ip').setDescription('Target IP').setRequired(true)),
    new SlashCommandBuilder().setName('dns-lookup').setDescription('Detailed DNS Enum').addStringOption(o => o.setName('domain').setDescription('Domain').setRequired(true)),
    new SlashCommandBuilder().setName('whois').setDescription('WHOIS Data Lookup').addStringOption(o => o.setName('domain').setDescription('Domain').setRequired(true)),
    new SlashCommandBuilder().setName('breach-check').setDescription('Check Credential Leaks').addStringOption(o => o.setName('query').setDescription('Email/User').setRequired(true)),
    new SlashCommandBuilder().setName('user-stalk').setDescription('Username Availability Search').addStringOption(o => o.setName('user').setDescription('Username').setRequired(true)),
    new SlashCommandBuilder().setName('headers').setDescription('HTTP Header Analysis').addStringOption(o => o.setName('url').setDescription('Target URL').setRequired(true)),

    // --- DEVELOPER ---
    new SlashCommandBuilder().setName('code-audit').setDescription('Identify Vulns in Code').addStringOption(o => o.setName('snippet').setDescription('Paste Code').setRequired(true)),
    new SlashCommandBuilder().setName('regex-master').setDescription('Regex Generator').addStringOption(o => o.setName('pattern').setDescription('What to match').setRequired(true)),
    new SlashCommandBuilder().setName('docker-gen').setDescription('Dockerfile Creator').addStringOption(o => o.setName('stack').setDescription('Tech Stack').setRequired(true)),
    new SlashCommandBuilder().setName('git-fix').setDescription('Git Conflict Solver').addStringOption(o => o.setName('issue').setDescription('Git Error').setRequired(true)),
    new SlashCommandBuilder().setName('json-tool').setDescription('JSON Formatter').addStringOption(o => o.setName('data').setDescription('JSON String').setRequired(true)),

    // --- SYSTEM (Hidden) ---
    new SlashCommandBuilder().setName('system-stats').setDescription('Dev Only: Stats'),
    new SlashCommandBuilder().setName('api-health').setDescription('Dev Only: Health'),
    new SlashCommandBuilder().setName('clear-cache').setDescription('Dev Only: Purge Cache'),

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[DEPLOY] Refreshing ${commands.length} application commands...`);
        // Change this line for instant update in your server
await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
);
        console.log('[DEPLOY] Success! Commands registered.');
    } catch (error) {
        console.error(error);
    }
})();
