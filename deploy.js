const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1491832782043873390";
const GUILD_ID = "1356614313896312864";

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Tạo role phái"),

  new SlashCommandBuilder()
    .setName("phai")
    .setDescription("Tạo bảng chọn phái"),

  new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Tạo vote mới")
    .addStringOption(option =>
      option
        .setName("noidung")
        .setDescription("Nội dung vote")
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName("thoigian")
        .setDescription("Thời gian vote (giờ)")
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("🚀 Đang đăng ký lệnh...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Đã đăng ký lệnh xong!");
  } catch (err) {
    console.error("❌ Lỗi đăng ký lệnh:", err);
  }
})();