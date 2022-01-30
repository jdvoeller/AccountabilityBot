const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const CronJob = require('cron').CronJob;

// FIREBASE DATABASE
// https://console.firebase.google.com/u/0/project/accountability-aff36/firestore/data/~2F

// Reminders
const WeeklyReminder = 'Hey Everyone, remember to use the command (!set) and use Mon Tue Wed Thu Fri Sat Sun to set your schedule today for the current week. Example: !set Mon, Wed, Fri to schedule your workouts for Monday, Wednesday, and Friday. When you have finish with a day use the complete command (!complete) with the day you completed. Example: "!complete Thu"';

// Commands
const PREFIX = '!';
const SET_KEY_WORD = 'set';
const COMPLETE_KEY_WORD = 'complete';

// Channels
const ACCOUNTABILITY_CHANNEL = '936017308319641630';

// Users
const USERS = {
	197921111973953536: 'Jordan',
	673392316731490304: 'Kody',
	673311526240911420: 'Tyler',
	190193825476509696: 'Derek',
	119962433979809793: 'Harri',
	162667595546361856: 'Braxton',
}

// Logic
const client = new Client({ intents: [Intents.FLAGS.GUILDS, 'GUILD_MESSAGES'] });

client.once('ready', () => {
	console.log('Fired up and ready to serve...');
	// '1 30 9 * * 0' - 9:30 every sunday
	const JOB = new CronJob('1 30 9 * * 0', () => {
		client.channels.cache.get(ACCOUNTABILITY_CHANNEL).send('@everyone ' + WeeklyReminder);
	});
	JOB.start();
});

client.on('messageCreate', message => {
	// Ignore messages without prefix and if it's the bot
	if (!message.content.startsWith(PREFIX) || message.author.bot) return;

	if (message.content.toLocaleLowerCase().startsWith(PREFIX+SET_KEY_WORD)) {
		message.reply('most excellent');
	} else if (message.content.toLocaleLowerCase().startsWith(PREFIX+COMPLETE_KEY_WORD)) {
		console.log('complete');
	} else {
		console.log(message);
	}
})


function createUserObj(user, message) {
	return {
		userName: USERS[user.author.id]
	}
}

client.login(token);