const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// 🔑 TOKEN
const TOKEN = process.env.TOKEN;

// 🎭 Emoji phái (đổi lại ID emoji server của bạn)
const roleIcons = {
  "Thần Tương": "<:thantuong:1234567890>",
  "Cửu Linh": "<:cuulinh:1234567890>",
  "Thiết Y": "<:thiety:1234567890>",
  "Tố Vấn": "<:tovan:1234567890>",
  "Huyết Hà": "<:huyethai:1234567890>",
  "Long Ngâm": "<:longngam:1234567890>",
  "Toái Mộng": "<:toaimong:1234567890>"
};

// 🎨 Màu embed theo phái
const roleEmbedColors = {
  "Thần Tương": 0xffcc00,
  "Cửu Linh": 0xff4d4d,
  "Thiết Y": 0x33ff99,
  "Tố Vấn": 0x66ccff,
  "Huyết Hà": 0xff66cc,
  "Long Ngâm": 0x9966ff,
  "Toái Mộng": 0x00e6e6
};

// 🚀 Khi bot sẵn sàng
client.once('ready', () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
});

// 📌 Lệnh /phai (tạo bảng chọn phái)
client.on('interactionCreate', async interaction => {

  // ===== /phai =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'phai') {

    const buttons = Object.keys(roleIcons).map(name =>
      new ButtonBuilder()
        .setCustomId(`phai_${name}`)
        .setLabel(name)
        .setEmoji(roleIcons[name])
        .setStyle(ButtonStyle.Secondary) // ⚪ tất cả xám
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(
        new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮 Chọn Phái")
      .setDescription("Bấm vào nút bên dưới để chọn phái của bạn")
      .setColor(0x2b2d31);

    await interaction.reply({
      embeds: [embed],
      components: rows
    });
  }

  // ===== BUTTON CLICK =====
  if (interaction.isButton()) {

    if (!interaction.customId.startsWith('phai_')) return;

    const roleName = interaction.customId.replace('phai_', '');

    const embed = new EmbedBuilder()
      .setTitle("✨ Chọn phái thành công")
      .setDescription(`Bạn đã chọn phái: **${roleName}**`)
      .setColor(roleEmbedColors[roleName] || 0x999999);

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

// 🔐 LOGIN
client.login(TOKEN);