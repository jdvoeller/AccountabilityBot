const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const CronJob = require('cron').CronJob;

// Firebase
const ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
ADMIN.initializeApp({
	credential: ADMIN.credential.cert(SERVICE_ACCOUNT),
});

const DB = ADMIN.firestore();
const COLLECTION = 'allUsers';

// db.collection('new').doc('testDoc').set({ test: 'test'});

// FIREBASE DATABASE
// https://console.firebase.google.com/u/0/project/accountability-aff36/firestore/data/~2F

// Reminders
const WeeklyReminder = 'Hey Everyone, remember to use the command (!set) and use Mon Tue Wed Thu Fri Sat Sun to set your schedule today for the current week. Example: !set Mon Wed Fri to schedule your workouts for Monday, Wednesday, and Friday. When you have finish with a day use the complete command (!complete) with the day you completed. Example: "!complete Thu"';

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
		DB.collection(COLLECTION).doc(message.author.id).set(createUserObj(message.author, message.content)).then(() => {
			console.log(`${message.author.username} updated/created successfully`);
		});
	} else if (message.content.toLocaleLowerCase().startsWith(PREFIX+COMPLETE_KEY_WORD)) {
		getUserById(message.author.id).then((data) => {
			let updatedUser = updateUserAndCompleteDay(data.data(), message.content);
			if (updatedUser.completed) {
				message.reply('@everyone ' + `${updatedUser.name}` + ' has completed their weekly goals! I bet you feel like a piece of shit compared to them xD');
			}
			DB.collection(COLLECTION).doc(updatedUser.id).set(updatedUser).then(() => console.log(`${updatedUser.name} completed/updated`));
		});
	} else {
		message.reply('An unexpected error ocurred');
	}
});

function updateUserAndCompleteDay(user, message) {
	let messageSplit = message.split(' ')[1].toLowerCase();
	switch (messageSplit) {
		case 'sun':
			user.sunCompleted = true;
			break;
		case 'mon':
			user.monCompleted = true;
			break;
		case 'tue':
			user.tueCompleted = true;
			break;
		case 'wed':
			user.wedCompleted = true;
			break;
		case 'thu':
			user.thuCompleted = true;
			break;
		case 'fri':
			user.friCompleted = true;
			break;
		case 'sat':
			user.satCompleted = true;
			break;
		default:
			return 'Error - day does not match naming convention';
	}

	if (user.sunCompleted && user.monCompleted && user.tueCompleted && user.wedCompleted && user.thuCompleted && user.friCompleted && user.satCompleted) {
		user.completed = true;
		user.atRisk = false;
	}
	return user;
}

function createUserObj(user, message) {
	const daysSelected = getDays(message);

	return {
		id: user.id,
		name: user.username,
		atRisk: false,
		completed: false,
		daysSelected: daysSelected,
		sunCompleted: dayIncluded(daysSelected, 'sun') ? false : true,
		monCompleted: dayIncluded(daysSelected, 'mon') ? false : true,
		tueCompleted: dayIncluded(daysSelected, 'tue') ? false : true,
		wedCompleted: dayIncluded(daysSelected, 'wed') ? false : true,
		thuCompleted: dayIncluded(daysSelected, 'thu') ? false : true,
		friCompleted: dayIncluded(daysSelected, 'fri') ? false : true,
		satCompleted: dayIncluded(daysSelected, 'sat') ? false : true,
		dateSet: new Date(),
	}
}

function getDays(message) {
	let days = message.split(' ');
	days.shift();
	days = days.map((day) => day.toLowerCase());
	return days;
}

function getUserById(id) {
	return DB.collection(COLLECTION).doc(id).get();
}

function dayIncluded(daysSelected, day) {
	const isIncluded = !!daysSelected.filter((selected) => selected === day).length;
	return isIncluded;

}

client.login(token);