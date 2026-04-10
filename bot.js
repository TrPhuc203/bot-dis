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

// ================= FILE STORAGE =================
const VOTE_FILE = "./voteData.json";

let voteMessages = fs.existsSync(VOTE_FILE)
  ? JSON.parse(fs.readFileSync(VOTE_FILE, "utf8"))
  : {};

function saveVote() {
  fs.writeFileSync(VOTE_FILE, JSON.stringify(voteMessages, null, 2));
}

// ================= ROLE ICONS =================
const roleIcons = {
  "Thần Tương": "<:thantuong:1492043620147265589>",
  "Cửu Linh": "<:cuulinh:1492043735041573025>",
  "Thiết Y": "<:thiety:1492043702313549904>",
  "Tố Vấn": "<:tovan:1492043581459009657>",
  "Huyết Hà": "<:huyetha:1492043637457158225>",
  "Long Ngâm": "<:longngam:1492043601058730085>",
  "Toái Mộng": "<:toaimong:1492043553612763147>"
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

// ================= PHÁI (FIX: LẤY TRỰC TIẾP ROLE DISCORD) =================
async function buildPhaiEmbed(guild) {
  let desc = "";

  for (let roleName in roleIcons) {
    const role = guild.roles.cache.find(r => r.name === roleName);

    if (!role) continue;

    const members = role.members.map(m => m);

    desc += `\n${roleIcons[roleName]} **${roleName} (${members.length})**\n`;

    if (members.length) {
      desc += members.map(m => `➤ ${m.displayName}`).join("\n");
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

// ================= VOTE EMBED =================
async function buildVoteEmbed(guild, vote) {
  const yes = [];
  const no = [];
  const unknown = [];

  const data = vote.data || {};

  for (let userId in data) {
    const info = data[userId];

    const member = await guild.members.fetch(userId).catch(() => null);
    const name = member ? member.displayName : "Unknown";

    const icon = roleIcons[info.role] || "❔";
    const text = `${icon} ${name}`;

    if (info.status === "yes") yes.push(text);
    else if (info.status === "no") no.push(text);
    else unknown.push(text);
  }

  return new EmbedBuilder()
    .setTitle("📊 VOTE")
    .setColor("#ff9900")
    .setDescription(`📝 **Nội dung:** ${vote.content}`)
    .addFields(
      { name: `✅ Tham gia`, value: yes.join("\n") || "_Trống_", inline: true },
      { name: `❌ Không`, value: no.join("\n") || "_Trống_", inline: true },
      { name: `❓ Chưa biết`, value: unknown.join("\n") || "_Trống_", inline: true }
    );
}

// ================= READY =================
client.once("ready", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  // 🔥 RESTORE VOTE SAU RESTART
  for (let msgId in voteMessages) {
    const vote = voteMessages[msgId];

    try {
      const guild = await client.guilds.fetch(vote.guildId);
      const channel = guild.channels.cache.get(vote.channelId);
      const msg = await channel.messages.fetch(msgId);

      await msg.edit({
        embeds: [await buildVoteEmbed(guild, vote)]
      });

    } catch (err) {
      console.log("Skip restore vote:", err.message);
    }
  }
});

// ================= UPDATE PHÁI =================
async function updatePhai(channel, guild) {
  try {
    const me = guild.members.me;

    if (!channel.permissionsFor(me).has(['SendMessages', 'ManageMessages'])) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const phaiMsg = messages.find(m => m.embeds[0]?.title === "🎮 Chọn phái");

    if (!phaiMsg) return;

    await phaiMsg.edit({
      embeds: [await buildPhaiEmbed(guild)]
    });

  } catch (err) {
    console.error(err.message);
  }
}

// ================= UPDATE VOTE =================
async function updateVote(msgId, guild) {
  const vote = voteMessages[msgId];
  if (!vote) return;

  try {
    const channel = guild.channels.cache.get(vote.channelId);
    const msg = await channel.messages.fetch(msgId);

    await msg.edit({
      embeds: [await buildVoteEmbed(guild, vote)]
    });

  } catch (err) {
    console.error(err.message);
  }
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  // ========== SETUP ==========
  if (interaction.isChatInputCommand() && interaction.commandName === "setup") {
    await interaction.deferReply({ ephemeral: true });

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

  // ========== PHÁI ==========
  if (interaction.isChatInputCommand() && interaction.commandName === "phai") {

    const buttons = Object.keys(roleIcons).map(name =>
      new ButtonBuilder()
        .setCustomId(`phai_${name}`)
        .setLabel(name)
        .setEmoji(roleIcons[name])
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

  // ========== VOTE ==========
  if (interaction.isChatInputCommand() && interaction.commandName === "vote") {

    const content = interaction.options.getString("noidung");
    const durationHours = interaction.options.getNumber("thoigian") || 1;

    const msg = await interaction.channel.send({
      embeds: [await buildVoteEmbed(interaction.guild, { content, data: {} })],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("vote_yes").setStyle(ButtonStyle.Success).setLabel("✅ Tham gia"),
          new ButtonBuilder().setCustomId("vote_no").setStyle(ButtonStyle.Danger).setLabel("❌ Không"),
          new ButtonBuilder().setCustomId("vote_unknown").setStyle(ButtonStyle.Secondary).setLabel("❓ Chưa biết")
        )
      ]
    });

    voteMessages[msg.id] = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      content,
      data: {},
      expiresAt: Date.now() + durationHours * 3600000
    };

    saveVote();

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
    }, durationHours * 3600000);
  }

  // ========== BUTTON ==========
  if (interaction.isButton()) {

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
          for (let r in roleIcons) {
            const role = guild.roles.cache.find(x => x.name === r);
            if (role) await member.roles.remove(role).catch(() => {});
          }

          // add new role
          const newRole = guild.roles.cache.find(r => r.name === roleName);
          if (newRole) await member.roles.add(newRole).catch(() => {});

          await updatePhai(interaction.channel, guild);

          // sync vote role
          for (let msgId in voteMessages) {
            const vote = voteMessages[msgId];
            if (vote.data[userId]) {
              vote.data[userId].role = roleName;
              await updateVote(msgId, guild);
            }
          }

          saveVote();

        } catch (err) {
          console.error(err);
        }
      });

      return;
    }

    // ===== VOTE =====
    if (interaction.customId.startsWith("vote_")) {

      const status = interaction.customId.split("_")[1];
      const voteId = interaction.message.id;
      const vote = voteMessages[voteId];

      if (!vote) return;

      setImmediate(async () => {
        vote.data[userId] = vote.data[userId] || { role: null, status: "unknown" };
        vote.data[userId].status = status;

        // lấy role từ discord
        for (let r in roleIcons) {
          const role = guild.roles.cache.find(x => x.name === r);
          if (role?.members.has(userId)) {
            vote.data[userId].role = r;
          }
        }

        saveVote();
        await updateVote(voteId, guild);
      });

      return;
    }
  }
});

client.login(TOKEN);