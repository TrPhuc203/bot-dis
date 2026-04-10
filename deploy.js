const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1491832782043873390";
const GUILD_ID = "1356614313896312864";

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Tạo role phái + màu"),

  new SlashCommandBuilder()
    .setName("phai")
    .setDescription("Chọn phái"),

  new SlashCommandBuilder()
    .setName("mau")
    .setDescription("Chọn màu tên"),

  new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Tạo vote")
    .addStringOption(o =>
      o.setName("noidung").setDescription("Nội dung").setRequired(true)
    )
    .addNumberOption(o =>
      o.setName("thoigian").setDescription("Giờ").setRequired(false)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Đang deploy...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Done deploy!");
  } catch (err) {
    console.error(err);
  }
})();