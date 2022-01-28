const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');

const USERS = {
	jordan: '197921111973953536',
}

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once('ready', () => {
	console.log(client);
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'test') {
		console.log(interaction);
		await interaction.reply('harri is a piece of shit');
	}
});

client.login(token);