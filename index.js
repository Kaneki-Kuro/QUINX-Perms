const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, PermissionsBitField, ChannelType } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== Define roles and their permissions (use exact names from your server) =====
const rolePermissionsMap = {
  '🔴 Admin': ['SendMessages', 'ManageMessages', 'AttachFiles'],
  '🟢 Mod': ['ManageMessages', 'ReadMessageHistory'],
  '🟡 Helper': ['AttachFiles', 'EmbedLinks'],
  '@everyone': ['AddReactions', 'ReadMessageHistory'] // This will be skipped
};

// ===== Define the slash command =====
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

// ===== Register slash command =====
client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

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

// ===== Handle command interaction =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'permissions') return;

  const channel = interaction.options.getChannel('channel');

  console.log(`\n🔧 Running /permissions on #${channel.name}`);
  console.log('🧾 Available roles in server:');
  interaction.guild.roles.cache.forEach(role => {
    console.log(`- ${role.name}`);
  });

  try {
    for (const [roleName, perms] of Object.entries(rolePermissionsMap)) {
      if (roleName === '@everyone') {
        console.log('⏭️ Skipping @everyone');
        continue;
      }

      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        console.log(`❌ Role not found: "${roleName}"`);
        continue;
      }

      console.log(`✅ Setting permissions for role: "${role.name}"`);
      await channel.permissionOverwrites.edit(role.id, {
        Allow: perms.map(p => PermissionsBitField.Flags[p])
      });
    }

    await interaction.reply(`✅ Permissions synced in <#${channel.id}> (excluding @everyone).`);
  } catch (err) {
    console.error('❌ Error updating permissions:', err);
    await interaction.reply({ content: '❌ Failed to update permissions.', ephemeral: true });
  }
});

// ===== Start the bot =====
client.login(process.env.TOKEN);
