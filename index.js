const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Apply server-level role permissions to a selected channel (excluding @everyone)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to sync role permissions to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
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

  const channel = interaction.options.getChannel('channel');

  try {
    await interaction.deferReply({ ephemeral: true });

    let updated = 0;

    for (const role of interaction.guild.roles.cache.values()) {
      if (role.name === '@everyone') continue;

      const serverPerms = role.permissions.toArray();
      if (serverPerms.length === 0) continue;

      try {
        await channel.permissionOverwrites.edit(role.id, {
          allow: PermissionsBitField.resolve(serverPerms)
        });

        console.log(`✅ Granted ${serverPerms.length} perms to ${role.name}`);
        updated++;
      } catch (roleErr) {
        console.warn(`❌ Failed for ${role.name}:`, roleErr.message);
      }
    }

    await interaction.editReply(`✅ Applied server-level permissions for ${updated} roles to <#${channel.id}> (excluding @everyone).`);
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
