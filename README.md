# AccountabilityBot
Discord bot to have people set and complete goals.

The Bot reminds people to set goals, to complete goals, and when they are at risk of missing goals.

User data is stored in Firestore DB.

## discord.js config file
index.js requires a config file you need to setup yourself. The example file looks like:
```
{
	"token": "<DISCORD_BOT_TOKEN_ID>",
	"clientId": "<DISCORD_BOT_CLIENT_ID>",
	"guildId": "<DISCORD_CHANNEL_ID"
}
```

## Firebase service account key
Similar to the discord.js config file, we need a serviceAccountKey.json file from firebase to access your firestore databse. You can access this key by going into your project settings page of your firebase app. Generate a new private key for Node.js and move that file into your folder structure here. Require that file inside of the index.js

## Cron times
Cron times have a strange (at first) syntax: '* * * * * *'
```
'1 30 9 * * *' = 9:30:01 (meaning this will run at the 1st second of the 30th minute of the 9th hour every day)
```
 - The 1 represents the seconds (0, 59)
 - The 30 represents the minutes (0, 59)
 - The 9 represents the hour (0, 23)
 - The rest of the * represent ALL for day of the month, month, and day of the week
Learn more here: https://www.netiq.com/documentation/cloud-manager-2-5/ncm-reference/data/bexyssf.html
