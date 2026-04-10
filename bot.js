const fs = require("fs");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= TOKEN =================
const TOKEN = process.env.TOKEN;

// ================= LOG START =================
console.log("🚀 BOT STARTING...");

// ================= ROLE ICON =================
const roleIcons = {
  "Thần Tương": "🌀",
  "Cửu Linh": "🔥",
  "Thiết Y": "⚔️",
  "Tố Vấn": "🌿",
  "Huyết Hà": "🩸",
  "Long Ngâm": "🐉",
  "Toái Mộng": "🌙"
};

// ================= READY FIX =================
client.once("clientReady", async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);

  try {
    // preload members (FIX hiển thị role user cũ)
    for (const guild of client.guilds.cache.values()) {
      await guild.members.fetch();
      console.log(`📦 Loaded members: ${guild.name}`);
    }
  } catch (err) {
    console.log("❌ FETCH MEMBER ERROR:", err.message);
  }
});

// ================= BUILD PHÁI =================
async function buildPhaiEmbed(guild) {
  let desc = "";

  const members = await guild.members.fetch(); // FIX QUAN TRỌNG

  for (let roleName in roleIcons) {
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) continue;

    const list = members.filter(m => m.roles.cache.has(role.id));

    desc += `\n${roleIcons[roleName]} **${roleName} (${list.size})**\n`;

    if (list.size > 0) {
      desc += list.map(m => `• ${m.displayName}`).join("\n");
    } else {
      desc += "_Chưa có ai_";
    }

    desc += "\n";
  }

  return new EmbedBuilder()
    .setTitle("🎮 Hệ Thống Phái")
    .setColor("#00aaff")
    .setDescription(desc);
}

// ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {
  try {

    if (!interaction.isButton()) return;

    console.log("BUTTON:", interaction.customId);

    // demo response để test bot có hoạt động không
    await interaction.reply({
      content: "✅ Bot đã nhận button!",
      ephemeral: true
    });

  } catch (err) {
    console.log("INTERACTION ERROR:", err.message);
  }
});

// ================= LOGIN =================
client.login(TOKEN)
  .then(() => console.log("🔑 LOGIN OK"))
  .catch(err => console.log("❌ LOGIN FAIL:", err.message));