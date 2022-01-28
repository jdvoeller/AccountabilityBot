const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('Test command'),
	async execute(interaction) {
		await interaction.reply('Fuck me in tha asshole man');
	}
}