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

// ✅ Allowed roles only
const allowedRoles = [
  'Manager', 'Developer', 'Sr. Admin', 'Admin', 'Sr. Mod',
  'Mod', 'Helper', 'Builder', 'Youtuber', 'Booster', 'Friends', 'Members'
];

// ✅ NEW source channel to copy from
const sourceChannelId = '1389479756671619184';

const commands = [
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Clone permissions from template channel to a selected channel (for specific roles)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to apply permissions to')
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
    console.error('❌ Command registration failed:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'permissions') return;

  const targetChannel = interaction.options.getChannel('channel');

  try {
    await interaction.deferReply({ ephemeral: true });

    const sourceChannel = await interaction.guild.channels.fetch(sourceChannelId);
    if (!sourceChannel) {
      return await interaction.editReply('❌ Failed to fetch source channel.');
    }

    let updated = 0;

    for (const [roleId, overwrite] of sourceChannel.permissionOverwrites.cache) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role || role.name === '@everyone') continue;
      if (!allowedRoles.includes(role.name)) continue;

      try {
        await targetChannel.permissionOverwrites.edit(role.id, {
          allow: overwrite.allow,
          deny: overwrite.deny
        });

        console.log(`✅ Synced ${role.name}`);
        updated++;
      } catch (err) {
        console.warn(`❌ Could not sync ${role.name}:`, err.message);
      }
    }

    await interaction.editReply(`✅ Copied permissions from <#${sourceChannelId}> to <#${targetChannel.id}> for ${updated} roles.`);
  } catch (err) {
    console.error('❌ Error syncing permissions:', err);
    try {
      await interaction.editReply({ content: '❌ Failed to sync permissions.' });
    } catch (replyErr) {
      console.error('❌ Failed to send error reply:', replyErr);
    }
  }
});

client.login(process.env.TOKEN);
