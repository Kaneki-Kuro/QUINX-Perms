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

const sourceChannelId = '1389479756671619184'; // ✅ your new source

const commands = [
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Copy permissions from template channel to selected channel')
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
    console.error('❌ Command registration failed:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'permissions') return;

  const targetChannel = interaction.options.getChannel('channel');

  // 👇 Reply immediately (prevent timeout)
  interaction.reply({ content: '⏳ Syncing permissions...', ephemeral: true })
    .then(async () => {
      try {
        const sourceChannel = await interaction.guild.channels.fetch(sourceChannelId);
        if (!sourceChannel) {
          return interaction.editReply('❌ Source channel not found.');
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

        await interaction.editReply(`✅ Synced ${updated} role permissions from <#${sourceChannelId}> to <#${targetChannel.id}>.`);
      } catch (err) {
        console.error('❌ Sync error:', err);
        await interaction.editReply('❌ Failed to sync permissions.');
      }
    })
    .catch(err => {
      console.error('❌ Immediate reply failed:', err);
    });
});

client.login(process.env.TOKEN);
