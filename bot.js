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

// ================= EMOJI PHÁI (FIX CHUẨN DISCORD) =================
const roleIcons = {
  "Thần Tương": "<:thantuong:1492043620147265589>",
  "Cửu Linh": "<:cuulinh:1492043735041573025>",
  "Thiết Y": "<:thiety:1492043702313549904>",
  "Tố Vấn": "<:tovan:1492043581459009657>",
  "Huyết Hà": "<:huyetha:1492043637457158225>",
  "Long Ngâm": "<:longngam:1492043601058730085>",
  "Toái Mộng": "<:toaimong:1492043735041573025>"
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

// ================= EMBED PHÁI =================
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

// ================= EMBED VOTE =================
async function buildVoteEmbed(guild, voteData, content) {
  const yesList = [];
  const noList = [];
  const unknownList = [];

  for (let userId in voteData) {
    const info = voteData[userId];

    const role = info.role || "Chưa chọn";
    const icon = roleIcons[role] || "❔";
    const name = await getName(guild, userId);

    const text = `${icon} ${name}`;

    if (info.status === "yes") yesList.push(text);
    else if (info.status === "no") noList.push(text);
    else unknownList.push(text);
  }

  return new EmbedBuilder()
    .setTitle("📊 VOTE")
    .setColor("#ff9900")
    .setDescription(`📝 **Nội dung:** ${content}`)
    .addFields(
      {
        name: `✅ Tham gia (${yesList.length})`,
        value: yesList.length ? yesList.join("\n") : "_Trống_",
        inline: true
      },
      {
        name: `❌ Không tham gia (${noList.length})`,
        value: noList.length ? noList.join("\n") : "_Trống_",
        inline: true
      },
      {
        name: `❓ Chưa biết (${unknownList.length})`,
        value: unknownList.length ? unknownList.join("\n") : "_Trống_",
        inline: true
      }
    )
    .setFooter({ text: `Tổng người vote: ${Object.keys(voteData).length}` });
}

// ================= READY (FIX ĐÚNG) =================
client.once("ready", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

// ================= UPDATE PHÁI =================
async function updatePhai(channel, guild) {
  try {
    const me = guild.members.me;

    if (!channel.permissionsFor(me).has([
      'ViewChannel',
      'ReadMessageHistory',
      'SendMessages',
      'ManageMessages'
    ])) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const phaiMsg = messages.find(m => m.embeds[0]?.title === "🎮 Chọn phái");
    if (!phaiMsg) return;

    const embed = await buildPhaiEmbed(guild);
    await phaiMsg.edit({ embeds: [embed] });

  } catch (err) {
    console.error("Không thể update phái:", err.message);
  }
}

// ================= UPDATE VOTE =================
async function updateVote(msgId, guild) {
  const vote = voteMessages[msgId];
  if (!vote) return;

  try {
    const channel = guild.channels.cache.get(vote.channelId);
    if (!channel) return;

    const me = guild.members.me;

    if (!channel.permissionsFor(me).has([
      'ViewChannel',
      'ReadMessageHistory',
      'SendMessages',
      'ManageMessages'
    ])) return;

    const msg = await channel.messages.fetch(msgId);
    if (!msg) return;

    const embed = await buildVoteEmbed(guild, vote.data, vote.content);
    await msg.edit({ embeds: [embed] });

  } catch (err) {
    console.error("Không thể update vote:", err.message);
  }
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  // ---------------- SETUP ----------------
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

  // ---------------- PHÁI ----------------
  if (interaction.isChatInputCommand() && interaction.commandName === "phai") {

    const buttons = Object.keys(roleIcons).map(name =>
      new ButtonBuilder()
        .setCustomId(`phai_${name}`)
        .setLabel(`${name}`)
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

  // ---------------- VOTE ----------------
  if (interaction.isChatInputCommand() && interaction.commandName === "vote") {

    const content = interaction.options.getString("noidung");
    const durationHours = interaction.options.getNumber("thoigian") || 1;

    await interaction.deferReply();

    const msg = await interaction.channel.send({
      embeds: [await buildVoteEmbed(interaction.guild, {}, content)],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("vote_yes").setLabel("✅ Tham gia").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("vote_no").setLabel("❌ Không tham gia").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("vote_unknown").setLabel("❓ Chưa biết").setStyle(ButtonStyle.Secondary)
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

    interaction.deleteReply().catch(() => {});

    // disable sau thời gian
    setTimeout(async () => {
      try {
        const message = await interaction.channel.messages.fetch(msg.id);

        const disabled = new ActionRowBuilder().addComponents(
          message.components[0].components.map(b =>
            ButtonBuilder.from(b).setDisabled(true)
          )
        );

        await message.edit({ components: [disabled] });

      } catch (err) {
        console.error("Disable vote lỗi:", err.message);
      }
    }, durationHours * 3600000);
  }

  // ---------------- BUTTON ----------------
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
            const oldRole = guild.roles.cache.find(x => x.name === r);
            if (oldRole && member.roles.cache.has(oldRole.id)) {
              await member.roles.remove(oldRole).catch(() => {});
            }

            phaiData[r] = (phaiData[r] || []).filter(id => id !== userId);
          }

          // add new role
          const newRole = guild.roles.cache.find(r => r.name === roleName);
          if (newRole) await member.roles.add(newRole).catch(() => {});

          if (!phaiData[roleName]) phaiData[roleName] = [];
          phaiData[roleName].push(userId);

          await updatePhai(interaction.channel, guild);

          // update votes
          for (let msgId in voteMessages) {
            const vote = voteMessages[msgId];
            if (vote.data[userId]) vote.data[userId].role = roleName;
            await updateVote(msgId, guild);
          }

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
        try {

          vote.data[userId] = vote.data[userId] || { role: null, status: "unknown" };
          vote.data[userId].status = status;

          for (let r in phaiData) {
            if (phaiData[r].includes(userId)) {
              vote.data[userId].role = r;
            }
          }

          await updateVote(voteId, guild);

        } catch (err) {
          console.error(err);
        }
      });

      return;
    }
  }
});

// ================= LOGIN =================
client.login(TOKEN);