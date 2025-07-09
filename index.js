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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Apply server-level role permissions to a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to sync permissions to')
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
    console.error('❌ Command registration failed:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'permissions') return;

  const channel = interaction.options.getChannel('channel');

  try {
    let updated = 0;

    for (const role of interaction.guild.roles.cache.values()) {
      if (role.name === '@everyone') continue;

      const allowedPerms = role.permissions.toArray(); // array of permission names
      if (allowedPerms.length === 0) continue;

      const permissionFlags = allowedPerms.map(p => PermissionsBitField.Flags[p]);

      await channel.permissionOverwrites.edit(role.id, {
        allow: permissionFlags
      });

      console.log(`✅ Gave ${allowedPerms.length} perms to ${role.name}`);
      updated++;
    }

    await interaction.reply(`✅ Granted server-level permissions to <#${channel.id}> for ${updated} roles (excluding @everyone).`);
  } catch (err) {
    console.error('❌ Error syncing permissions:', err);
    await interaction.reply({ content: '❌ Failed to sync permissions.', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
