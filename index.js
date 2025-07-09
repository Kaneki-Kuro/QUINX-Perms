const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const allowedRoles = [
  'Manager', 'Developer', 'Sr. Admin', 'Admin', 'Sr. Mod',
  'Mod', 'Helper', 'Builder', 'Youtuber', 'Booster', 'Friends', 'Members'
];

// ✅ Your source channel ID
const sourceChannelId = '1389479756671619184';

const commands = [
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Copy permissions from the template channel to another one')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Target channel')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON()
];

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash command /permissions registered!');
  } catch (err) {
    console.error('❌ Failed to register command:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'permissions') return;

  const targetChannel = interaction.options.getChannel('channel');

  // ✅ Defer reply immediately
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (err) {
    console.error('❌ Failed to defer reply:', err);
    return;
  }

  try {
    const sourceChannel = await interaction.guild.channels.fetch(sourceChannelId);
    if (!sourceChannel) {
      return await interaction.editReply('❌ Source channel not found.');
    }

    let updated = 0;

    for (const [roleId, overwrite] of sourceChannel.permissionOverwrites.cache) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role || role.name === '@everyone') continue;
      if (!allowedRoles.includes(role.name)) continue;

      await targetChannel.permissionOverwrites.edit(role.id, {
        allow: overwrite.allow,
        deny: overwrite.deny
      });

      updated++;
    }

    await interaction.editReply(`✅ Copied permissions from <#${sourceChannelId}> to <#${targetChannel.id}> for ${updated} roles.`);
  } catch (err) {
    console.error('❌ Sync error:', err);
    try {
      await interaction.editReply({ content: '❌ Failed to sync permissions.' });
    } catch (e) {
      console.error('❌ Could not send error reply:', e);
    }
  }
});

client.login(process.env.TOKEN);
