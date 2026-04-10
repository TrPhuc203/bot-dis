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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;

// ================= FILE =================
const VOTE_FILE = "./voteData.json";

let voteMessages = fs.existsSync(VOTE_FILE)
  ? JSON.parse(fs.readFileSync(VOTE_FILE, "utf8"))
  : {};

function saveVote() {
  fs.writeFileSync(VOTE_FILE, JSON.stringify(voteMessages, null, 2));
}

// ================= ROLE ICON =================
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
  const member = await guild.members.fetch(id).catch(() => null);
  return member ? member.displayName : "Unknown";
}

// ================= PHÁI (FIX: CACHE FULL MEMBER + ROLE REAL TIME) =================
async function buildPhaiEmbed(guild) {
  let desc = "";

  for (let roleName in roleIcons) {
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) continue;

    // 🔥 FIX QUAN TRỌNG: force lấy member từ guild (KHÔNG dùng role.members cache)
    const members = await guild.members.fetch();
    const list = members.filter(m => m.roles.cache.has(role.id));

    desc += `\n${roleIcons[roleName]} **${roleName} (${list.size})**\n`;

    if (list.size > 0) {
      desc += list.map(m => `➤ ${m.displayName}`).join("\n");
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
      { name: "✅ Tham gia", value: yes.join("\n") || "_Trống_", inline: true },
      { name: "❌ Không", value: no.join("\n") || "_Trống_", inline: true },
      { name: "❓ Chưa biết", value: unknown.join("\n") || "_Trống_", inline: true }
    );
}

// ================= READY FIX =================
client.once("clientReady", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  // 🔥 FORCE LOAD ALL MEMBERS (QUAN TRỌNG)
  for (const guild of client.guilds.cache.values()) {
    await guild.members.fetch();
  }

  // 🔥 RESTORE VOTE CŨ
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
      console.log("skip vote:", err.message);
    }
  }
});

// ================= UPDATE PHÁI =================
async function updatePhai(channel, guild) {
  try {
    const me = guild.members.me;
    if (!channel.permissionsFor(me).has(["SendMessages", "ManageMessages"])) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const phaiMsg = messages.find(m => m.embeds[0]?.title === "🎮 Chọn phái");
    if (!phaiMsg) return;

    await phaiMsg.edit({
      embeds: [await buildPhaiEmbed(guild)]
    });

  } catch (err) {
    console.error(err);
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
    console.error(err);
  }
}

// ================= INTERACTION =================
client.on("interactionCreate", async interaction => {

  // ===== PHÁI =====
  if (interaction.isButton() && interaction.customId.startsWith("phai_")) {

    const roleName = interaction.customId.replace("phai_", "");
    const member = await interaction.guild.members.fetch(interaction.user.id);

    await interaction.deferUpdate();

    setImmediate(async () => {
      try {

        // remove old roles
        for (let r in roleIcons) {
          const role = interaction.guild.roles.cache.find(x => x.name === r);
          if (role) await member.roles.remove(role).catch(() => {});
        }

        // add new role
        const newRole = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (newRole) await member.roles.add(newRole).catch(() => {});

        await updatePhai(interaction.channel, interaction.guild);

        // sync vote role
        for (let msgId in voteMessages) {
          const vote = voteMessages[msgId];

          if (vote.data[interaction.user.id]) {
            vote.data[interaction.user.id].role = roleName;
            await updateVote(msgId, interaction.guild);
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
  if (interaction.isButton() && interaction.customId.startsWith("vote_")) {

    const status = interaction.customId.split("_")[1];
    const voteId = interaction.message.id;
    const vote = voteMessages[voteId];

    if (!vote) return;

    await interaction.deferUpdate();

    setImmediate(async () => {

      vote.data[interaction.user.id] = vote.data[interaction.user.id] || {
        role: null,
        status: "unknown"
      };

      vote.data[interaction.user.id].status = status;

      // lấy role từ Discord (REAL TIME)
      for (let r in roleIcons) {
        const role = interaction.guild.roles.cache.find(x => x.name === r);
        if (role?.members.has(interaction.user.id)) {
          vote.data[interaction.user.id].role = r;
        }
      }

      saveVote();
      await updateVote(voteId, interaction.guild);
    });

    return;
  }
});

client.login(TOKEN);