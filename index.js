const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, PermissionsBitField, ChannelType } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ====== Define the /permissions command ======
const commands = [
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Sync channel permissions with role permissions (excluding @everyone)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to update')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON()
];

// ====== Register slash command ======
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.on('ready', async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

// ====== Handle interactions ======
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'permissions') return;

  const channel = interaction.options.getChannel('channel');

  const rolePermissionsMap = {
    'Admin': ['SendMessages', 'ManageMessages', 'AttachFiles'],
    'Mod': ['ManageMessages', 'ReadMessageHistory'],
    'Helper': ['AttachFiles', 'EmbedLinks'],
    '@everyone': ['AddReactions', 'ReadMessageHistory'] // will be skipped
  };

  try {
    for (const [roleName, perms] of Object.entries(rolePermissionsMap)) {
      if (roleName === '@everyone') continue; // ⛔ Skip everyone

      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) continue;

      await channel.permissionOverwrites.edit(role.id, {
        Allow: perms.map(perm => PermissionsBitField.Flags[perm])
      });
    }

    await interaction.reply(`✅ Permissions synced in <#${channel.id}> (excluding @everyone).`);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Failed to update permissions.', ephemeral: true });
  }
});

// ====== Log in ======
client.login(process.env.TOKEN);
