const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

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
  "🎨 Đỏ Crimson": "#dc143c",
  "🎨 Cam Neon": "#ff6b00",
  "🎨 Vàng Gold": "#ffd700",
  "🎨 Xanh Lá Mint": "#00ff9d",
  "🎨 Xanh Dương Ocean": "#1e90ff",
  "🎨 Tím Royal": "#8a2be2",
  "🎨 Hồng Sakura": "#ff66cc",
  "🎨 Trắng Snow": "#ffffff",
  "🎨 Đen Shadow": "#1c1c1c",
  "🎨 Xám Steel": "#808080",
  "🎨 Cyan": "#00ffff",
  "🎨 Nâu Dark": "#8b4513",
  "🎨 Neon Green": "#39ff14",
  "🎨 Tím Pastel": "#c084fc",
  "🎨 Wine Red": "#7b1e3a"
};

let phaiData = {};
let voteMessages = {};

// ================= GET NAME =================
async function getName(guild, id) {
  try {
    const member = await guild.members.fetch(id);
    return member.displayName;
  } catch {
    return "Unknown";
  }
}

// ================= PHÁI EMBED =================
async function buildPhaiEmbed(guild) {
  let desc = "";

  for (let role in roleIcons) {
    const list = phaiData[role] || [];

    desc += `\n${roleIcons[role]} **${role} (${list.length})**\n`;

    if (list.length) {
      const names = await Promise.all(list.map(id => getName(guild, id)));
      desc += names.map(n => `➤ ${n}`).join("\n");
    } else {
      desc += "_Chưa có ai_";
    }

    desc += "\n";
  }

  return new EmbedBuilder()
    .setTitle("🎮 Chọn phái")
    .setColor("#00aaff")
    .setDescription(desc);
}

// ================= VOTE =================
async function buildVoteEmbed(guild, voteData, content) {
  const yes = [], no = [], unknown = [];

  for (let userId in voteData) {
    const name = await getName(guild, userId);

    const text = `👤 ${name}`;

    if (voteData[userId].status === "yes") yes.push(text);
    else if (voteData[userId].status === "no") no.push(text);
    else unknown.push(text);
  }

  return new EmbedBuilder()
    .setTitle("📊 VOTE")
    .setColor("#ff9900")
    .setDescription(`📝 **Nội dung:** ${content}`)
    .addFields(
      { name: `✅ Tham gia (${yes.length})`, value: yes.join("\n") || "_Trống_", inline: true },
      { name: `❌ Không (${no.length})`, value: no.join("\n") || "_Trống_", inline: true },
      { name: `❓ Chưa biết (${unknown.length})`, value: unknown.join("\n") || "_Trống_", inline: true }
    )
    .setFooter({ text: `Tổng vote: ${Object.keys(voteData).length}` });
}

// ================= SETUP =================
async function setupRoles(guild) {
  const allRoles = { ...roleIcons, ...colorRoles };

  for (let name of Object.keys(allRoles)) {
    if (!guild.roles.cache.find(r => r.name === name)) {
      await guild.roles.create({
        name,
        color: colorRoles[name] || undefined,
        mentionable: false
      });
    }
  }
}

// ================= READY (FIXED) =================
client.once("clientReady", (client) => {
  console.log(`🤖 Bot đã online: ${client.user.tag}`);
  console.log(`📡 Server: ${client.guilds.cache.size}`);
});

// ================= MAIN =================
client.on("interactionCreate", async interaction => {

  const guild = interaction.guild;
  const userId = interaction.user.id;

  // ===== SETUP =====
  if (interaction.isChatInputCommand() && interaction.commandName === "setup") {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
    }

    await setupRoles(guild);
    return interaction.reply({ content: "✅ Setup xong phái + màu", ephemeral: true });
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
      embeds: [await buildPhaiEmbed(guild)],
      components: rows
    });
  }

  // ===== MÀU =====
  if (interaction.isChatInputCommand() && interaction.commandName === "mau") {

    const buttons = Object.keys(colorRoles).map(name =>
      new ButtonBuilder()
        .setCustomId(`color_${name}`)
        .setLabel(name.replace("🎨 ", ""))
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    while (buttons.length) {
      rows.push(new ActionRowBuilder().addComponents(buttons.splice(0, 3)));
    }

    return interaction.reply({
      content: "🎨 Chọn màu cho tên của bạn:",
      components: rows,
      ephemeral: true
    });
  }

  // ===== BUTTON HANDLER =====
  if (interaction.isButton()) {

    await interaction.deferUpdate();

    const member = await guild.members.fetch(userId);

    // ===== PHÁI =====
    if (interaction.customId.startsWith("phai_")) {
      const roleName = interaction.customId.replace("phai_", "");

      setImmediate(async () => {

        for (let r of Object.keys(roleIcons)) {
          const role = guild.roles.cache.find(x => x.name === r);
          if (role) await member.roles.remove(role).catch(() => {});
          phaiData[r] = (phaiData[r] || []).filter(id => id !== userId);
        }

        const newRole = guild.roles.cache.find(r => r.name === roleName);
        if (newRole) await member.roles.add(newRole).catch(() => {});

        if (!phaiData[roleName]) phaiData[roleName] = [];
        phaiData[roleName].push(userId);
      });

      return;
    }

    // ===== MÀU =====
    if (interaction.customId.startsWith("color_")) {
      const colorName = interaction.customId.replace("color_", "");

      setImmediate(async () => {

        // remove old color roles
        for (let r of Object.keys(colorRoles)) {
          const role = guild.roles.cache.find(x => x.name === r);
          if (role) await member.roles.remove(role).catch(() => {});
        }

        // add new color role
        const newRole = guild.roles.cache.find(r => r.name === colorName);
        if (newRole) await member.roles.add(newRole).catch(() => {});
      });

      return;
    }

    // ===== VOTE =====
    if (interaction.customId.startsWith("vote_")) {
      const status = interaction.customId.split("_")[1];
      const msgId = interaction.message.id;

      if (!voteMessages[msgId]) return;

      setImmediate(() => {
        voteMessages[msgId].data[userId] = {
          status
        };
      });

      return;
    }
  }
});

client.login(TOKEN);