const fs = require('fs');
const { Client, Intents } = require('discord.js');
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

// Logic
const client = new Client({ intents: [Intents.FLAGS.GUILDS, 'GUILD_MESSAGES'] });

client.once('ready', () => {
	console.log('Fired up and ready to serve...');
	
	// Start reminder jobs
	startWeeklyReminder();
	startMorningReminder();
	startBerateLosers();
});

client.on('messageCreate', message => {
	// Ignore messages without prefix and if it's the bot
	if (!message.content.startsWith(PREFIX) || message.author.bot) return;

	if (message.content.toLowerCase().startsWith(PREFIX+SET_KEY_WORD)) {
		DB.collection(COLLECTION).doc(message.author.id).set(createUserObj(message.author, message.content)).then(() => {
			console.log(`${message.author.username} updated/created successfully`);
			message.reply(`${message.author.username} Set their goals!`);
		});
	} else if (message.content.toLowerCase().startsWith(PREFIX+COMPLETE_KEY_WORD)) {
		getUserById(message.author.id).then((data) => {
			let updatedUser = updateUserAndCompleteDay(data.data(), message.content);
			if (updatedUser.completed) {
				message.reply('@everyone ' + `${updatedUser.name}` + ' has completed their weekly goals! I bet you feel like a piece of shit compared to them xD');
			} else {
				message.reply(`Great job on completing your goal for today ${updatedUser.name}!!`);
			}
			DB.collection(COLLECTION).doc(updatedUser.id).set(updatedUser).then(() => console.log(`${updatedUser.name} completed/updated`));
		});
	} else {
		message.reply('ERR0R - Check your command and try again. Make sure there are no commas and you are using the correct day format. Example: "!set mon wed sat"');
	}
});

function startWeeklyReminder() {
	// '1 30 9 * * 0' - 9:30 every sunday
	const JOB = new CronJob('1 30 9 * * 0', () => {
		client.channels.cache.get(ACCOUNTABILITY_CHANNEL).send('@everyone ' + WeeklyReminder);
	});
	JOB.start();
}

function startMorningReminder() {
	// Runs at 10AM everyday
	const JOB = new CronJob('1 0 10 * * *', () => {
		const today = new Date().getDay();

		getUsersCollection().then((users) => {
			const AllUsers = users.docs.map(doc => doc.data());
			let userString;
			switch(today) {
				// Sunday
				case 0:
					usersString = getStringOfUsersDueToday(AllUsers, 'sun');
					if (!!usersString) {
						sendDailyReminder(usersString);
					}
					break;

				// Monday
				case 1:
					usersString = getStringOfUsersDueToday(AllUsers, 'mon');
					if (!!usersString) {
						sendDailyReminder(usersString);
					}
					break;
					
				// Tuesday
				case 2:
					usersString = getStringOfUsersDueToday(AllUsers, 'tue');
					if (!!usersString) {
						sendDailyReminder(usersString);
					}
					break;
	
				// Wednesday
				case 3:
					usersString = getStringOfUsersDueToday(AllUsers, 'wed');
					if (!!usersString) {
						sendDailyReminder(usersString);
					}
					break;
				
				// Thursday
				case 4:
					usersString = getStringOfUsersDueToday(AllUsers, 'thu');
					if (!!usersString) {
						sendDailyReminder(usersString);
					}
					break;
				
				// Friday
				case 5:
					usersString = getStringOfUsersDueToday(AllUsers, 'fri');
					if (!!usersString) {
						sendDailyReminder(usersString);
					}
					break;
	
				// Saturday
				case 6:
					usersString = getStringOfUsersDueToday(AllUsers, 'sat');
					if (!!usersString) {
						sendDailyReminder(usersString);
					}
					break;
			}
		});
		console.log('Daily reminder sent');
	});
	JOB.start();
}

function startBerateLosers() {
	// Runs at 8PM everyday
	const JOB = new CronJob('1 0 20 * * *', () => {
		const today = new Date().getDay();

		getUsersCollection().then((users) => {
			const AllUsers = users.docs.map(doc => doc.data());
			let userString;
			switch(today) {
				// Sunday
				case 0:
					usersString = getStringOfUsersDueToday(AllUsers, 'sun');
					if (!!usersString) {
						sendDailyBeratement(usersString);
					}
					break;

				// Monday
				case 1:
					usersString = getStringOfUsersDueToday(AllUsers, 'mon');
					if (!!usersString) {
						sendDailyBeratement(usersString);
					}
					break;
					
				// Tuesday
				case 2:
					usersString = getStringOfUsersDueToday(AllUsers, 'tue');
					if (!!usersString) {
						sendDailyBeratement(usersString);
					}
					break;
	
				// Wednesday
				case 3:
					usersString = getStringOfUsersDueToday(AllUsers, 'wed');
					if (!!usersString) {
						sendDailyBeratement(usersString);
					}
					break;
				
				// Thursday
				case 4:
					usersString = getStringOfUsersDueToday(AllUsers, 'thu');
					if (!!usersString) {
						sendDailyBeratement(usersString);
					}
					break;
				
				// Friday
				case 5:
					usersString = getStringOfUsersDueToday(AllUsers, 'fri');
					if (!!usersString) {
						sendDailyBeratement(usersString);
					}
					break;
	
				// Saturday
				case 6:
					usersString = getStringOfUsersDueToday(AllUsers, 'sat');
					if (!!usersString) {
						sendDailyBeratement(usersString);
					}
					break;
			}
		});
		console.log('Beratement reminder sent');
	});
	JOB.start();
}

function sendDailyReminder(users) {
	client.channels.cache.get(ACCOUNTABILITY_CHANNEL).send(`Reminder the following people have goals to be met today: ${users}`);
}

function sendDailyBeratement(users) {
	client.channels.cache.get(ACCOUNTABILITY_CHANNEL).send('@everyone ' + `The following fakies havent completed their goals: ${users}. Tag them and remind them.`);
}

function getStringOfUsersDueToday(userArr, day) {
	let usersDue;
	switch (day) {
		case 'sun':
			usersDue = userArr.filter((user) => !user.sunCompleted);
			break;
		case 'mon':
			usersDue = userArr.filter((user) => !user.monCompleted);
			break;
		case 'tue':
			usersDue = userArr.filter((user) => !user.tueCompleted);
			break;
		case 'wed':
			usersDue = userArr.filter((user) => !user.wedCompleted);
			break;
		case 'thu':
			usersDue = userArr.filter((user) => !user.thuCompleted);
			break;
		case 'fri':
			usersDue = userArr.filter((user) => !user.friCompleted);
			break;
		case 'sat':
			usersDue = userArr.filter((user) => !user.satCompleted);
			break;
		default:
			break;
	}

	if (!usersDue.length) {
		return '';
	}

	let stringOfUsers = '';
	usersDue.forEach((user) => stringOfUsers = stringOfUsers + `${user.name}, `);
	stringOfUsers = stringOfUsers.slice(0, -2)
	return stringOfUsers;
}

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

function getUsersCollection() {
	return DB.collection(COLLECTION).get();
}

function dayIncluded(daysSelected, day) {
	const isIncluded = !!daysSelected.filter((selected) => selected === day).length;
	return isIncluded;

}

client.login(token);