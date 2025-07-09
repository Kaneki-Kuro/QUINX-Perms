const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
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

// 🟣 Emoji → Role map
const ROLE_MAP = {
  "1392473008081342617": "1389488153097801758", // Emoji 1
  "1392473002918019173": "1389488206059147304", // Emoji 2
  "1392472995372732488": "1389488238020001833", // Emoji 3
};

const CHANNEL_ID = "YOUR_CHANNEL_ID_HERE"; // 👈 Replace with your actual channel ID
let MESSAGE_ID = ""; // Will hold the message ID with embed + reactions

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  const messages = await channel.messages.fetch({ limit: 10 });

  const existing = messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title === "Reaction Roles");

  let message;

  if (existing) {
    message = existing;
    MESSAGE_ID = message.id;
    console.log("🔁 Reusing existing embed message");
  } else {
    // 🔷 Create embed
    const description = Object.entries(ROLE_MAP)
      .map(([emojiId, roleId]) => `<:${emojiId}> : <@&${roleId}>`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Reaction Roles")
      .setDescription(description)
      .setColor("#8e44ad"); // Purple theme

    message = await channel.send({ embeds: [embed] });

    for (const emojiId of Object.keys(ROLE_MAP)) {
      await message.react(emojiId).catch(console.error);
    }

    MESSAGE_ID = message.id;
    console.log("📨 New embed message sent with ID:", MESSAGE_ID);
  }
});

// ✅ Role assignment
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

// ❌ Role removal
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
