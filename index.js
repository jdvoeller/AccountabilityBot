const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const CRON_JOB = require('cron').CronJob;
const ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
const { channel } = require('./discord-channel.json');

// Firebase
ADMIN.initializeApp({
	credential: ADMIN.credential.cert(SERVICE_ACCOUNT),
});
const DB = ADMIN.firestore();
const COLLECTION = 'allUsers';

// Reminders
const WEEKLY_REMINDER_TEXT = '@everyone ' + 'Hey everyone, remember to use the command (!set) and use Mon Tue Wed Thu Fri Sat Sun to set your schedule today for the current week. Example: !set Mon Wed Fri to schedule your workouts for Monday, Wednesday, and Friday. When you have finish with a day use the complete command (!complete) with the day you completed. Example: "!complete Thu"';
const DAILY_REMINDER_TEXT = 'REMINDER!!! The following people have goals to be met today: ';
const BERATING_REMINDER_TEXT = '@everyone ' + 'The following fakies have not completed their goals: ';
const WRAP_UP_REMINDER_TEXT = '@everyone ' + 'Here is your weekly wrap-up:';

// Commands
const PREFIX = '!';
const SET_KEY_WORD = 'set';
const COMPLETE_KEY_WORD = 'complete';
const COM_KEY_WORD = 'com';
const MY_DAYS = 'my days';

// Channel
const ACCOUNTABILITY_CHANNEL = channel;

// Cron times
const SUNDAY_WEEKLY_REMINDER_TIME = '1 30 9 * * 0'; // 9:30AM - every sunday
const DAILY_REMINDER_TIME = '1 0 10 * * *'; // 10AM - every day
const BERATING_REMINDER_TIME = '1 0 20 * * *'; // 8PM - every day
const WRAP_UP_REMINDER_TIME = '1 43 14 * * 2'; // 7:30AM - every sunday

// Initialize discord.js client
const CLIENT = new Client({ intents: [Intents.FLAGS.GUILDS, 'GUILD_MESSAGES'] });

CLIENT.once('ready', () => {
	console.log('Fired up and ready to serve...');
	
	// Start reminder jobs
	startReminderJob(SUNDAY_WEEKLY_REMINDER_TIME, WEEKLY_REMINDER_TEXT, 'Sunday set reminder', true); // Weekly sunday reminder to set goals
	startReminderJob(DAILY_REMINDER_TIME, DAILY_REMINDER_TEXT, 'Daily reminder'); // Daily reminder to complete goal
	startReminderJob(BERATING_REMINDER_TIME, BERATING_REMINDER_TEXT, 'Berating reminder'); // Daily berating of people at risk for their goal
	setWrapUpReminder();

});

CLIENT.on('messageCreate', message => {
	if (message.author.bot || !isValidCommand(message.content)) return;

	// SETTING
	if (message.content.toLowerCase().startsWith(PREFIX+SET_KEY_WORD)) {
		DB.collection(COLLECTION).doc(message.author.id).set(createUserObj(message.author, message.content)).then(() => {
			console.log(`${message.author.username} updated/created successfully`);

			// Celebrate setting of goal
			message.reply(`${message.author.username} Set their goals!`);
		});

	// COMPLETED
	} else if (message.content.toLowerCase().startsWith(PREFIX+COMPLETE_KEY_WORD) || message.content.toLowerCase().startsWith(PREFIX+COM_KEY_WORD)) {
		getUserById(message.author.id).then((data) => {
			let updatedUser = updateUserAndCompleteDay(data.data(), message.content);

			if (updatedUser.completed) {
				// Celebrate completion of weekly goals
				message.reply('@everyone ' + `${updatedUser.name}` + ' has completed their weekly goals!');
			} else {
				// Celebrate completion goal
				message.reply(`Great job on completing your goal for today ${updatedUser.name}!!`);
			}

			DB.collection(COLLECTION).doc(updatedUser.id).set(updatedUser).then(() => console.log(`${updatedUser.name} completed/updated`));
		});

	// GET MY DAYS
	} else if (message.content.toLowerCase().startsWith(PREFIX+MY_DAYS)) {
		getUserById(message.author.id).then((data) => {
			const userData = data.data();
			let reply = '';
			userData.daysSelected.forEach((day) => reply = reply + `${day}, `);
			reply = reply.slice(0, -2);
			message.reply(`${message.author.username}, your selected days are: ${reply}.`);
		});

	// ERROR
	} else {
		message.reply('ERR0R - Check your command and try again. Make sure there are no commas and you are using the correct day format. Example: "!set mon wed sat"');
	}
});

function isValidCommand(message) {
	const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
	return ((message.startsWith(PREFIX+SET_KEY_WORD) || message.startsWith(PREFIX+COMPLETE_KEY_WORD) || message.startsWith(PREFIX+COM_KEY_WORD)) && DAYS.some((day) => message.endsWith(day)) || daylessCommand(message));
}

function daylessCommand(message) {
	return message.toLowerCase().startsWith(PREFIX+MY_DAYS);
}

function startReminderJob(cronTime, message, jobName, withoutUsers = false) {
	const JOB = new CRON_JOB(cronTime, () => {
		if (withoutUsers) {
			sendReminder(message);
			console.log('Reminder sent');
		} else {
			const TODAY = new Date().getDay();

			getUsersCollection().then((users) => {
				const ALL_USERS = users.docs.map(doc => doc.data());
				const USERS_STRING = getStringOfUsersDueToday(ALL_USERS, TODAY);
	
				if (!!USERS_STRING) {
					const UPDATED_MESSAGE = `${message} ${USERS_STRING}`;
					sendReminder(UPDATED_MESSAGE);
					console.log('Daily reminder sent');
				}
			});
		}
	});
	JOB.start();
	console.log(`${jobName} Job set`);
}

function setWrapUpReminder() {
	const JOB = new CRON_JOB(WRAP_UP_REMINDER_TIME, () => {
		getUsersCollection().then((users) => {
			let allWrapUpText = [];
			const ALL_USERS = users.docs.map((doc => doc.data()));
			ALL_USERS.forEach((user) => {
				let daysCompleted = [];
				let daysNotCompleted = [];
				user.daysSelected.forEach((day) => {
					switch (day) {
						case 'sun':
							user.sunCompleted ? daysCompleted.push(day) : daysNotCompleted.push(day);
							break;
						case 'mon':
							user.monCompleted ? daysCompleted.push(day) : daysNotCompleted.push(day);
							break;
						case 'tue':
							user.tueCompleted ? daysCompleted.push(day) : daysNotCompleted.push(day);
							break;
						case 'wed':
							user.wedCompleted ? daysCompleted.push(day) : daysNotCompleted.push(day);
							break;
						case 'thu':
							user.thuCompleted ? daysCompleted.push(day) : daysNotCompleted.push(day);
							break;
						case 'fri':
							user.friCompleted ? daysCompleted.push(day) : daysNotCompleted.push(day);
							break;
						case 'sat':
							user.satCompleted ? daysCompleted.push(day) : daysNotCompleted.push(day);
							break;
					}
				});
				allWrapUpText.push(`${user.name} completed ${daysCompleted}! They did not complete ${daysNotCompleted}!`);
			});
			allWrapUpText.forEach((text) => sendReminder(text));
		});
	});
	JOB.start();
	console.log('Wrap up job set');
}

function sendReminder(message) {
	CLIENT.channels.cache.get(ACCOUNTABILITY_CHANNEL).send(message);
}

function getStringOfUsersDueToday(userArr, day) {
	let usersDue;
	switch (day) {
		case 0:
			usersDue = userArr.filter((user) => !user.sunCompleted);
			break;
		case 1:
			usersDue = userArr.filter((user) => !user.monCompleted);
			break;
		case 2:
			usersDue = userArr.filter((user) => !user.tueCompleted);
			break;
		case 3:
			usersDue = userArr.filter((user) => !user.wedCompleted);
			break;
		case 4:
			usersDue = userArr.filter((user) => !user.thuCompleted);
			break;
		case 5:
			usersDue = userArr.filter((user) => !user.friCompleted);
			break;
		case 6:
			usersDue = userArr.filter((user) => !user.satCompleted);
			break;
		default:
			return '';
	}

	let stringOfUsers = '';
	usersDue.forEach((user) => stringOfUsers = stringOfUsers + `${user.name}, `);
	stringOfUsers = stringOfUsers.slice(0, -2);
	return stringOfUsers;
}

function updateUserAndCompleteDay(user, message) {
	const DAY = message.split(' ')[1].toLowerCase();
	switch (DAY) {
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
	}
	return user;
}

function createUserObj(user, message) {
	const DAYS_SELECTED = getDays(message);

	return {
		id: user.id,
		name: user.username,
		completed: false,
		daysSelected: DAYS_SELECTED,
		sunCompleted: dayIncluded(DAYS_SELECTED, 'sun') ? false : true,
		monCompleted: dayIncluded(DAYS_SELECTED, 'mon') ? false : true,
		tueCompleted: dayIncluded(DAYS_SELECTED, 'tue') ? false : true,
		wedCompleted: dayIncluded(DAYS_SELECTED, 'wed') ? false : true,
		thuCompleted: dayIncluded(DAYS_SELECTED, 'thu') ? false : true,
		friCompleted: dayIncluded(DAYS_SELECTED, 'fri') ? false : true,
		satCompleted: dayIncluded(DAYS_SELECTED, 'sat') ? false : true,
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
	const IS_INCLUDED = !!daysSelected.filter((selected) => selected === day).length;
	return IS_INCLUDED;
}

CLIENT.login(token);