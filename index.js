const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Emoji to Role map
const ROLE_MAP = {
  "1392473008081342617": "1389488153097801758",
  "1392473002918019173": "1389488206059147304",
  "1392472995372732488": "1389488238020001833",
  "1389488153097801758": "1389488178540318760"
};

const TARGET_CHANNEL_ID = "1392470690640433212";
let MESSAGE_ID = "";

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash command
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  const command = new SlashCommandBuilder()
    .setName("rr")
    .setDescription("Send reaction role embed")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator); // Admin only

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [command.toJSON()] }
    );
    console.log("✅ Slash command /rr registered");
  } catch (error) {
    console.error("❌ Failed to register /rr:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "rr") {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);

    const description = Object.entries(ROLE_MAP)
      .map(([emojiId, roleId]) => `<:${emojiId}> : <@&${roleId}>`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Reaction Roles")
      .setDescription(description)
      .setColor("#9b59b6");

    const message = await channel.send({ embeds: [embed] });

    for (const emojiId of Object.keys(ROLE_MAP)) {
      try {
        await message.react(emojiId);
      } catch (err) {
        console.error(`Failed to react with ${emojiId}:`, err);
      }
    }

    MESSAGE_ID = message.id;
    await interaction.reply({ content: "✅ Reaction role message sent!", ephemeral: true });
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.message.id !== MESSAGE_ID) return;

  const roleId = ROLE_MAP[reaction.emoji.id];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.add(roleId).catch(console.error);
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.message.id !== MESSAGE_ID) return;

  const roleId = ROLE_MAP[reaction.emoji.id];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.remove(roleId).catch(console.error);
});

client.login(process.env.TOKEN);
