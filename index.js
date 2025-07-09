const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType,
  PermissionsBitField
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
        .setDescription('The channel to sync permissions to')
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

  const channel = interaction.options.getChannel('channel');

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (err) {
    console.error('❌ Failed to defer reply:', err);
    return;
  }

  let updated = 0;

  try {
    for (const role of interaction.guild.roles.cache.values()) {
      if (role.name === '@everyone') continue;
      if (!role.permissions) continue;

      const perms = role.permissions.toArray();

      if (perms.length === 0) continue;

      const resolved = PermissionsBitField.resolve(perms);

      await channel.permissionOverwrites.set([
        ...channel.permissionOverwrites.cache.filter(o => o.id !== role.id).values(),
        {
          id: role.id,
          allow: resolved,
          type: 0 // Role
        }
      ]);

      console.log(`✅ Gave ${perms.length} permissions to ${role.name}`);
      updated++;
    }

    await interaction.editReply(`✅ Applied permissions to <#${channel.id}> for ${updated} roles (excluding @everyone).`);
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
