const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

// ================= DATA =================
const DATA_FILE = "./phaiData.json";

let phaiData = {};
let voteMessages = {};

if (fs.existsSync(DATA_FILE)) {
  try {
    phaiData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    phaiData = {};
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(phaiData, null, 2));
}

// ================= PHÁI =================
const roleIcons = {
  "Thần Tương": "🔮",
  "Cửu Linh": "🐺",
  "Thiết Y": "🛡️",
  "Tố Vấn": "🌿",
  "Huyết Hà": "🔥",
  "Long Ngâm": "⚔️",
  "Toái Mộng": "🥷"
};

// ================= MÀU =================
const colorRoles = {
  "Crimson Flame": "#e63946",
  "Royal Blue": "#1d4ed8",
  "Emerald Green": "#10b981",
  "Golden Sun": "#fbbf24",
  "Deep Purple": "#7c3aed",
  "Neon Pink": "#ff4d6d",
  "Ocean Cyan": "#06b6d4",
  "Shadow Black": "#111827",
  "Silver Mist": "#9ca3af",
  "Burnt Orange": "#f97316",
  "Rose Quartz": "#fb7185",
  "Midnight Indigo": "#312e81",
  "Lime Spark": "#84cc16",
  "Ice White": "#f8fafc",
  "Blood Wine": "#7f1d1d"
};

// ================= UTIL =================
async function getName(guild, id) {
  try {
    const m = await guild.members.fetch(id);
    return m.displayName;
  } catch {
    return "Unknown";
  }
}

// ================= READY =================
client.once("clientReady", (c) => {
  console.log(`Bot online: ${c.user.tag}`);
});

// ================= EMBED PHÁI =================
async function buildPhaiEmbed(guild) {
  let desc = "";

  for (let role in roleIcons) {
    const list = [...new Set((phaiData[role] || []).filter(Boolean))];
    const names = await Promise.all(list.map(id => getName(guild, id)));

    desc += `\n${roleIcons[role]} **${role} (${list.length})**\n`;
    desc += names.length ? names.map(n => `➤ ${n}`).join("\n") : "_Chưa có ai_";
    desc += "\n";
  }

  return new EmbedBuilder()
    .setTitle("🎮 Chọn phái")
    .setColor("#00aaff")
    .setDescription(desc);
}

// ================= UPDATE EMBED =================
async function updatePhai(channel, guild) {
  try {
    const msgs = await channel.messages.fetch({ limit: 50 });
    const phaiMsg = msgs.find(m => m.embeds[0]?.title === "🎮 Chọn phái");
    if (!phaiMsg) return;

    await phaiMsg.edit({
      embeds: [await buildPhaiEmbed(guild)]
    });

  } catch (err) {
    console.error(err);
  }
}

// ================= VOTE =================
async function getNameSafe(guild, id) {
  return getName(guild, id);
}

async function buildVoteEmbed(guild, data, content) {
  const yes = [], no = [], unknown = [];

  for (let id in data) {
    const info = data[id];
    const name = await getNameSafe(guild, id);

    const icon = roleIcons[info.role] || "❔";
    const text = `${icon} ${name}`;

    if (info.status === "yes") yes.push(text);
    else if (info.status === "no") no.push(text);
    else unknown.push(text);
  }

  return new EmbedBuilder()
    .setTitle("📊 VOTE")
    .setColor("#ff9900")
    .setDescription(`📝 ${content}`)
    .addFields(
      { name: "✅ Tham gia", value: yes.join("\n") || "_Trống_", inline: true },
      { name: "❌ Không", value: no.join("\n") || "_Trống_", inline: true },
      { name: "❓ Chưa biết", value: unknown.join("\n") || "_Trống_", inline: true }
    );
}

// ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {

  // ===== SETUP =====
  if (interaction.isChatInputCommand() && interaction.commandName === "setup") {

    await interaction.deferReply({ flags: 64 });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.editReply("❌ Không có quyền");
    }

    for (let name of Object.keys(roleIcons)) {
      if (!interaction.guild.roles.cache.find(r => r.name === name)) {
        await interaction.guild.roles.create({ name });
      }
    }

    for (let name of Object.keys(colorRoles)) {
      if (!interaction.guild.roles.cache.find(r => r.name === name)) {
        await interaction.guild.roles.create({
          name,
          color: colorRoles[name]
        });
      }
    }

    return interaction.editReply("✅ Setup xong phái + màu");
  }

  // ===== PHÁI =====
  if (interaction.isChatInputCommand() && interaction.commandName === "phai") {

    const buttons = Object.keys(roleIcons).map(name =>
      new ButtonBuilder()
        .setCustomId(`phai_${name}`)
        .setLabel(`${roleIcons[name]} ${name}`)
        .setStyle(ButtonStyle.Primary)
    );

    const rows = [];
    while (buttons.length) {
      rows.push(new ActionRowBuilder().addComponents(buttons.splice(0, 3)));
    }

    return interaction.reply({
      embeds: [await buildPhaiEmbed(interaction.guild)],
      components: rows
    });
  }

  // ===== MÀU =====
  if (interaction.isChatInputCommand() && interaction.commandName === "mau") {

    const buttons = Object.keys(colorRoles).map(name =>
      new ButtonBuilder()
        .setCustomId(`color_${name}`)
        .setLabel(name)
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    while (buttons.length) {
      rows.push(new ActionRowBuilder().addComponents(buttons.splice(0, 5)));
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎨 Chọn màu")
          .setColor("#ffffff")
          .setDescription("Chọn màu cho tên của bạn")
      ],
      components: rows
    });
  }

  // ===== VOTE =====
  if (interaction.isChatInputCommand() && interaction.commandName === "vote") {

    const content = interaction.options.getString("noidung");

    await interaction.deferReply();

    const msg = await interaction.channel.send({
      embeds: [await buildVoteEmbed(interaction.guild, {}, content)],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("vote_yes").setLabel("✅").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("vote_no").setLabel("❌").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("vote_unknown").setLabel("❓").setStyle(ButtonStyle.Secondary)
        )
      ]
    });

    voteMessages[msg.id] = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      content,
      data: {}
    };

    interaction.deleteReply().catch(() => {});
  }

  // ===== BUTTON =====
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const guild = interaction.guild;

  await interaction.deferUpdate();

  // ===== PHÁI =====
  if (interaction.customId.startsWith("phai_")) {

    const roleName = interaction.customId.replace("phai_", "");
    const member = await guild.members.fetch(userId);

    setImmediate(async () => {
      try {

        // remove phái cũ
        for (let r in phaiData) {
          phaiData[r] = (phaiData[r] || []).filter(id => id !== userId);

          const oldRole = guild.roles.cache.find(x => x.name === r);
          if (oldRole) await member.roles.remove(oldRole).catch(() => {});
        }

        // add phái mới
        const newRole = guild.roles.cache.find(r => r.name === roleName);
        if (newRole) await member.roles.add(newRole).catch(() => {});

        await member.fetch(true).catch(() => {});

        if (!phaiData[roleName]) phaiData[roleName] = [];
        if (!phaiData[roleName].includes(userId)) {
          phaiData[roleName].push(userId);
        }

        saveData();

        await updatePhai(interaction.channel, guild);

      } catch (e) {
        console.error(e);
      }
    });

    return;
  }

  // ===== MÀU =====
  if (interaction.customId.startsWith("color_")) {

    const colorName = interaction.customId.replace("color_", "");
    const member = await guild.members.fetch(userId);

    setImmediate(async () => {
      for (let c in colorRoles) {
        const role = guild.roles.cache.find(r => r.name === c);
        if (role) await member.roles.remove(role).catch(() => {});
      }

      const newRole = guild.roles.cache.find(r => r.name === colorName);
      if (newRole) await member.roles.add(newRole).catch(() => {});
    });

    return;
  }

  // ===== VOTE =====
  if (interaction.customId.startsWith("vote_")) {

    const status = interaction.customId.split("_")[1];
    const vote = voteMessages[interaction.message.id];
    if (!vote) return;

    setImmediate(() => {
      vote.data[userId] = vote.data[userId] || {};
      vote.data[userId].status = status;
    });

    return;
  }
});

client.login(TOKEN);