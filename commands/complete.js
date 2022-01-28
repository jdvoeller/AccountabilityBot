const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('complete')
		.setDescription('Completes a weekly goal'),
	async execute(interaction) {
		await interaction.reply('Complete goal works');
	}
}