const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('set')
		.setDescription('Sets a goal for the week'),
	async execute(interaction) {
		await interaction.reply('Set command works');
	}
}