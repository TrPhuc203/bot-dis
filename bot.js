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

// ================= ROLE ICON =================
const roleIcons = {
  "Thần Tương": "🔮",
  "Cửu Linh": "🐺",
  "Thiết Y": "🛡️",
  "Tố Vấn": "🌿",
  "Huyết Hà": "🔥",
  "Long Ngâm": "⚔️",
  "Toái Mộng": "🥷"
};

// ================= GET NAME =================
async function getName(guild, id) {
  try {
    const member = await guild.members.fetch(id);
    return member.displayName;
  } catch {
    return "Unknown";
  }
}

// ================= READY =================
client.once("ready", (client) => {
  console.log(`Bot online: ${client.user.tag}`);
});

// ================= PHÁI EMBED =================
async function buildPhaiEmbed(guild) {
  let desc = "";

  for (let role in roleIcons) {
    const list = [...new Set((phaiData[role] || []).filter(Boolean))];

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

// ================= UPDATE PHÁI =================
async function updatePhai(channel, guild) {
  try {
    const me = guild.members.me;
    if (!me) return;

    const perms = channel.permissionsFor(me);
    if (!perms?.has(PermissionsBitField.Flags.SendMessages)) return;

    const msgs = await channel.messages.fetch({ limit: 50 }).catch(() => {});
    if (!msgs) return;

    const phaiMsg = msgs.find(m => m.embeds[0]?.title === "🎮 Chọn phái");
    if (!phaiMsg) return;

    await phaiMsg.edit({
      embeds: [await buildPhaiEmbed(guild)]
    });

  } catch (err) {
    console.error("updatePhai error:", err.message);
  }
}

// ================= UPDATE VOTE =================
async function updateVote(msgId, guild) {
  const vote = voteMessages[msgId];
  if (!vote) return;

  try {
    const channel = await guild.channels.fetch(vote.channelId).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(msgId).catch(() => null);
    if (!msg) return;

    await msg.edit({
      embeds: [await buildVoteEmbed(guild, vote.data, vote.content)]
    });

  } catch (err) {
    console.error("updateVote error:", err.message);
  }
}

// ================= VOTE EMBED =================
async function getRoleFromUser(userId) {
  for (let r in phaiData) {
    if ((phaiData[r] || []).includes(userId)) return r;
  }
  return "Chưa chọn";
}

async function buildVoteEmbed(guild, voteData, content) {
  const yes = [];
  const no = [];
  const unknown = [];

  for (let userId in voteData) {
    const info = voteData[userId];

    const role = info.role || await getRoleFromUser(userId);
    const icon = roleIcons[role] || "❔";

    const name = await getName(guild, userId);
    const text = `${icon} ${name}`;

    if (info.status === "yes") yes.push(text);
    else if (info.status === "no") no.push(text);
    else unknown.push(text);
  }

  return new EmbedBuilder()
    .setTitle("📊 VOTE")
    .setColor("#ff9900")
    .setDescription(`📝 **Nội dung:** ${content}`)
    .addFields(
      { name: `✅ Tham gia`, value: yes.join("\n") || "_Trống_", inline: true },
      { name: `❌ Không`, value: no.join("\n") || "_Trống_", inline: true },
      { name: `❓ Chưa biết`, value: unknown.join("\n") || "_Trống_", inline: true }
    );
}

// ================= INTERACTION =================
client.on("interactionCreate", async interaction => {

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

    return interaction.editReply("✅ Setup xong");
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

  // ===== VOTE =====
  if (interaction.isChatInputCommand() && interaction.commandName === "vote") {

    const content = interaction.options.getString("noidung");
    const durationMs = (interaction.options.getNumber("thoigian") || 1) * 3600000;

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
      data: {},
      expiresAt: Date.now() + durationMs
    };

    interaction.deleteReply().catch(() => {});

    setTimeout(async () => {
      try {
        const message = await interaction.channel.messages.fetch(msg.id);

        const disabled = new ActionRowBuilder().addComponents(
          message.components[0].components.map(b =>
            ButtonBuilder.from(b).setDisabled(true)
          )
        );

        await message.edit({ components: [disabled] });
      } catch {}
    }, durationMs);
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

        // remove old roles
        for (let r in phaiData) {
          phaiData[r] = (phaiData[r] || []).filter(id => id !== userId);

          const oldRole = guild.roles.cache.find(x => x.name === r);
          if (oldRole) await member.roles.remove(oldRole).catch(() => {});
        }

        // add new role
        const newRole = guild.roles.cache.find(r => r.name === roleName);
        if (newRole) await member.roles.add(newRole).catch(() => {});

        if (!phaiData[roleName]) phaiData[roleName] = [];
        if (!phaiData[roleName].includes(userId)) {
          phaiData[roleName].push(userId);
        }

        saveData();

        if (interaction.channel) {
          await updatePhai(interaction.channel, guild);
        }

        for (let msgId in voteMessages) {
          const vote = voteMessages[msgId];
          if (vote.data[userId]) {
            vote.data[userId].role = roleName;
            await updateVote(msgId, guild);
          }
        }

      } catch (e) {
        console.error(e);
      }
    });

    return;
  }

  // ===== VOTE =====
  if (interaction.customId.startsWith("vote_")) {

    const status = interaction.customId.split("_")[1];
    const vote = voteMessages[interaction.message.id];
    if (!vote) return;

    setImmediate(async () => {
      vote.data[userId] = vote.data[userId] || {};
      vote.data[userId].status = status;
      await updateVote(interaction.message.id, guild);
    });

    return;
  }
});

client.login(TOKEN);