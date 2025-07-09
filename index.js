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

// Initialize bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Define your role-permission map (use actual role names from your server)
const rolePermissionsMap = {
  'Admin': ['SendMessages', 'ManageMessages', 'AttachFiles'],
  'Mod': ['ManageMessages', 'ReadMessageHistory'],
  'Helper': ['AttachFiles', 'EmbedLinks']
  // '@everyone': ['AddReactions'] <-- will be ignored if added
};

// Register slash command
const commands = [
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Syncs the selected channel permissions with role permissions (excludes @everyone)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Select the channel to sync')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON()
];

// Register slash command once bot is ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash command /permissions registered successfully.');
  } catch (err) {
    console.error('❌ Error registering slash command:', err);
  }
});

// Handle slash command execution
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'permissions') return;

  const channel = interaction.options.getChannel('channel');

  console.log(`\n🔧 Running /permissions for channel: #${channel.name}`);
  console.log('📋 Available roles in the server:');
  interaction.guild.roles.cache.forEach(role => console.log(`- ${role.name}`));

  try {
    for (const [roleName, perms] of Object.entries(rolePermissionsMap)) {
      if (roleName === '@everyone') continue; // Skip @everyone

      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        console.log(`❌ Role "${roleName}" not found.`);
        continue;
      }

      console.log(`✅ Applying permissions for role: "${role.name}"`);

      await channel.permissionOverwrites.edit(role.id, {
        allow: perms.map(perm => {
          const flag = PermissionsBitField.Flags[perm];
          if (!flag) console.log(`⚠️ Invalid permission: ${perm}`);
          return flag;
        }).filter(Boolean)
      });
    }

    await interaction.reply(`✅ Permissions synced in <#${channel.id}> (excluding @everyone).`);
  } catch (err) {
    console.error('❌ Failed to update permissions:', err);
    await interaction.reply({ content: '❌ Failed to update permissions.', ephemeral: true });
  }
});

// Login the bot
client.login(process.env.TOKEN);
