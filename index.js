const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const CRON_JOB = require('cron').CronJob;
const ADMIN = require('firebase-admin');
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
const { channel } = require('./discord-channel.json');
const { everyMorningTime, sundaySetTime, beratingTime } = require('./cronTimes.json');

const TYLER = '673311526240911420';

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

// Commands
const PREFIX = '!';
const SET_KEY_WORD = 'set';
const COMPLETE_KEY_WORD = 'complete';
const COM_KEY_WORD = 'com';
const MY_DAYS = 'my days';

// Channel
const ACCOUNTABILITY_CHANNEL = channel;

// Initialize discord.js client
const CLIENT = new Client({ intents: [Intents.FLAGS.GUILDS, 'GUILD_MESSAGES'] });

CLIENT.once('ready', () => {
	console.log('Fired up and ready to serve...');
	
	// Start reminder jobs
	startReminderJob(sundaySetTime, WEEKLY_REMINDER_TEXT, true); // Weekly sunday reminder to set goals
	startReminderJob(everyMorningTime, DAILY_REMINDER_TEXT); // Daily reminder to complete goal
	startReminderJob(beratingTime, BERATING_REMINDER_TEXT); // Daily berating of people at risk for their goal
});

CLIENT.on('messageCreate', message => {
	if (shouldRespondToTyler(message.content, message.author.id)) {
		message.reply('Aggressive...');
	}

	if (message.author.bot || !isValidCommand(message.content)) return;

	if (message.content.toLowerCase().startsWith(PREFIX+SET_KEY_WORD)) {
		setGoals(message);
	} else if (message.content.toLowerCase().startsWith(PREFIX+COMPLETE_KEY_WORD) || message.content.toLowerCase().startsWith(PREFIX+COM_KEY_WORD)) {
		completeGoal(message);
	} else if (message.content.toLowerCase().startsWith(PREFIX+MY_DAYS)) {
		getMyDays(message);
	// Handle Tyler
	} else {
		message.reply('ERR0R - Check your command and try again. Make sure there are no commas and you are using the correct day format. Example: "!set mon wed sat"');
	}
});

// Command functions START
function setGoals(message) {
	DB.collection(COLLECTION).doc(message.author.id).set(createUserObj(message.author, message.content)).then(() => {
		console.log(`${message.author.username} updated/created successfully`);

		// Celebrate setting of goal
		message.reply(`${message.author.username} Set their goals!`);
	});
}

function completeGoal(message) {
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
}

function getMyDays(message) {
	getUserById(message.author.id).then((data) => {
		const userData = data.data();
		let reply = '';
		userData.daysSelected.forEach((day) => reply = reply + `${day}, `);
		reply = reply.slice(0, -2);
		message.reply(`${message.author.username}, your selected days are: ${reply}.`);
	});
}
// Command functions END

function isValidCommand(message) {
	const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
	return ((message.toLowerCase().startsWith(PREFIX+SET_KEY_WORD) ||
		message.toLowerCase().startsWith(PREFIX+COMPLETE_KEY_WORD) ||
		message.toLowerCase().startsWith(PREFIX+COM_KEY_WORD)) && DAYS.some((day) => message.toLowerCase().endsWith(day)) ||
		daylessCommand(message));
}

function daylessCommand(message) {
	return message.toLowerCase().startsWith(PREFIX+MY_DAYS);
}

function startReminderJob(cronTime, message, withoutUsers = false) {
	const JOB = new CRON_JOB(cronTime, () => {
		if (withoutUsers) {
			sendMessage(message);
			console.log('Reminder sent');
		} else {
			getUsersCollection().then((users) => {
				const ALL_USERS = users.docs.map(doc => doc.data());
				const USERS_STRING = getStringOfUsersDueToday(ALL_USERS, new Date());
	
				if (!!USERS_STRING) {
					const UPDATED_MESSAGE = `${message} ${USERS_STRING}`;
					sendMessage(UPDATED_MESSAGE);
					console.log('Daily reminder sent');
				}
			});
		}
	});
	JOB.start();
	console.log(`${cronTime} Job set`);
}

function sendMessage(message) {
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

function shouldRespondToTyler(message, id) {
	return id === TYLER && (
		message.toLowerCase().includes('fuck') ||
		message.toLowerCase().includes('shut') ||
		message.toLowerCase().includes('bot')
	);
}

CLIENT.login(token);
