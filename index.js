const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Slash command: /clonepermissions from:#channel to:#channel
const commands = [
  new SlashCommandBuilder()
    .setName('clonepermissions')
    .setDescription('Clone permission overwrites from one channel to another')
    .addChannelOption(option =>
      option.setName('from')
        .setDescription('Channel to copy permissions from')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('to')
        .setDescription('Channel to apply permissions to')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON()
];

// Register slash command
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash command /clonepermissions registered!');
  } catch (err) {
    console.error('❌ Failed to register command:', err);
  }
});

// Handle command logic
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'clonepermissions') return;

  const fromChannel = interaction.options.getChannel('from');
  const toChannel = interaction.options.getChannel('to');

  try {
    const overwrites = fromChannel.permissionOverwrites.cache.map(overwrite => ({
      id: overwrite.id,
      allow: overwrite.allow.bitfield,
      deny: overwrite.deny.bitfield,
      type: overwrite.type
    }));

    await toChannel.permissionOverwrites.set(overwrites);
    await interaction.reply(`✅ Permissions cloned from <#${fromChannel.id}> to <#${toChannel.id}>`);
  } catch (err) {
    console.error('❌ Error cloning permissions:', err);
    await interaction.reply({ content: '❌ Failed to clone permissions.', ephemeral: true });
  }
});

// Start the bot
client.login(process.env.TOKEN);
