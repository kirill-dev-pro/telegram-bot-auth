# Telegram-bot-auth

Package that provides function to perform telegram bot auth and recieve user data

## Examples

```js
import telegramLogin from 'telegram-bot-auth'

try {
  const params = {
    botId: 1234567890, // telergam id of bot
    botNick: 'yourBot', // telegram username of bot
    origin: 'https://your.domain', // domain that is linked to your bot
    phone: '+1234567890' // phone number to auth
  }
  const tgUser = await telegramLogin(params)
} catch (error) {
  console.error('Telegram auth error', error)
}
```

This will send auth data to telegram servers and then telegram user with such phone number will recieve message from system to accept or decline his auth in `your.domain` 

## Related Packages

React-telegram-auth will be ready soon
