const TELEGRAM_BASE_URL = 'https://oauth.telegram.org'

const checkResponseJSON = (response: Response) =>
  response
    .clone()
    .json()
    .then(() => true)
    .catch(() => false)
const checkResponseText = (response: Response) =>
  response
    .clone()
    .text()
    .then(() => true)
    .catch(() => false)

const requestTelegramWidget = (botNick: string, origin: string) =>
  `${TELEGRAM_BASE_URL}/embed/${botNick}?origin=${encodeURIComponent(
    origin,
  )}&size=large&request_access=write`
const requestAuthLink = (botId: number, origin: string) =>
  `${TELEGRAM_BASE_URL}/auth/request?bot_id=${botId}&origin=${encodeURIComponent(
    origin,
  )}&request_access=write`
const requestTokenLink = (botId: number, origin: string) =>
  `${TELEGRAM_BASE_URL}/auth/login?bot_id=${botId}&origin=${encodeURIComponent(origin)}`
const requestUserDataLink = (botId: number, lang = 'en') =>
  `${TELEGRAM_BASE_URL}/auth/get?bot_id=${botId}&lang=${lang}`

interface LoginViaTelegramParams {
  botId: number
  botNick: string
  origin: string
  phone: string
  lang?: string
}

interface TelegramAuthCookies {
  stel_ssid: string
  stel_tsession: string
}

interface TelegramSessionToken {
  stel_token: string
}

/**
 * Function to make perform multiple requests to perform telegram auth
 * @param botId - Telegram bot id
 * @param botNick - Username of the bot
 * @param origin - origin url of your website
 * @param phone - format string +1234567890
 * @param lang - optional, default 'en'
 */

export async function loginViaTelegram({
  botId,
  botNick,
  origin,
  phone,
  lang = 'en',
}: LoginViaTelegramParams) {
  if (!botId || typeof botId !== 'number') {
    throw new Error('botId parameter should be number')
  }
  if (!origin || typeof origin !== 'string') {
    throw new Error('origin paramater should be string')
  }
  if (!phone || typeof phone !== 'string') {
    throw new Error('phone parameter should be string')
  }
  try {
    const session = await requestGetTelegramSession({ botNick, origin })
    const cookies = await requestTelegramLogin({ phone, botId, origin }, session)
    const token = await loginStatusCheck({ botId, origin, phone }, cookies)
    const tgUser = await getTelegramUser({ botId, lang, origin, phone }, cookies, token)
    return tgUser
  } catch (error) {
    console.error('Login to telegram failed', error)
    throw error
  }
}

async function requestGetTelegramSession({
  botNick,
  origin,
}: {
  botNick: string
  origin: string
}): Promise<{ stel_ssid: string }> {
  let response
  try {
    const request = new Request(requestTelegramWidget(botNick, origin))
    response = await fetch(request, {
      credentials: 'none' as RequestCredentials,
      headers: {
        Cookie: '',
      },
    })
  } catch (err) {
    throw new Error('Network connection error')
  }
  if (response.status !== 200) throw new Error('Connection error')
  const cookie = response.headers.get('set-cookie')
  if (!cookie) throw new Error('No cookies recieved. Probably you have to refresh enviroment')

  if (cookie && cookie.indexOf('stel_token=DELETED') > 0) {
    // repeat
    return requestGetTelegramSession({ botNick, origin })
  }
  try {
    const stel_ssid = /(?:stel_ssid=)(\S+)(?=;)/.exec(cookie)?.[1]
    if (!stel_ssid) throw new Error('Wrong cookie format. Probably library itself is outdated')
    return { stel_ssid }
  } catch (err) {
    throw new Error('No cookies recieved. Probably you have to refresh enviroment')
  }
}

async function requestTelegramLogin(
  { phone, botId, origin }: Omit<LoginViaTelegramParams, 'botNick'>,
  { stel_ssid }: { stel_ssid: string },
) {
  console.error('Requestiong telegram login')
  let response
  const formData = new FormData()
  try {
    formData.append('phone', phone.replace(/\+/g, ''))
    const request = new Request(requestAuthLink(botId, origin), {
      method: 'POST',
      body: formData,
    })
    response = await fetch(request)
  } catch (err) {
    throw new Error('Network connection error')
  }
  if (response.status !== 200) throw new Error('Connection error')
  if (await checkResponseJSON(response)) {
    const success = await response.json()
    if (!success) throw new Error('Telegram login failed')

    const cookie = response.headers.get('set-cookie')
    if (!cookie) throw new Error('No cookies recieved. Probably you have to refresh enviroment')

    // const stel_ssid = /(?:stel_ssid=)(\S+)(?=;)/.exec(cookie)[1]
    const stel_tsession = /(?:stel_tsession=)(\S+)(?=;)/.exec(cookie ?? '')?.[1]
    if (!stel_tsession) throw new Error('Wrong cookie format. Probably library itself is outdated')

    return { stel_ssid, stel_tsession }
  } else if (await checkResponseText(response)) {
    const message = await response.text()
    throw new Error(message)
  } else {
    throw new Error('Connection error')
  }
}

async function checkTelegramLoginStatus(
  { phone, botId, origin }: Omit<LoginViaTelegramParams, 'botNick'>,
  { stel_ssid, stel_tsession }: { stel_ssid: string; stel_tsession: string },
) {
  console.error('Checking login status...')
  if (!stel_ssid || !stel_tsession) return
  let response
  try {
    const headers = new Headers()
    headers.append(
      'Cookie',
      `stel_ssid=${stel_ssid};
      stel_tsession_${phone}=${stel_tsession};
      stel_tsession=${stel_tsession}`,
    )
    const request = new Request(requestTokenLink(botId, origin), {
      method: 'POST',
      headers,
    })
    response = await fetch(request)
  } catch (err) {
    throw new Error('Network error')
  }

  if (await checkResponseJSON(response)) {
    const status = await response.clone().json()
    if (!status) {
      return null
    } else {
      const cookie = response.headers.get('set-cookie')
      if (!cookie) throw new Error('No cookies recieved. Probably you have to refresh enviroment')

      const stel_token = /(?:stel_token=)(\S+)(?=;)/.exec(cookie)?.[1]
      if (!stel_token) throw new Error('Wrong cookie format. Probably library itself is outdated')

      return { stel_token }
    }
  } else if (await checkResponseText(response)) {
    const message = await response.text()
    if (message) {
      throw new Error(message)
    } else {
      throw new Error('Unexpected server response')
    }
  } else {
    throw new Error('Unexpected error')
  }
}

function loginStatusCheck(
  { botId, origin, phone }: Omit<LoginViaTelegramParams, 'botNick'>,
  { stel_ssid, stel_tsession }: TelegramAuthCookies,
): Promise<{ stel_token: string }> {
  return new Promise((resolve, reject) => {
    const process = async () => {
      try {
        const result = await checkTelegramLoginStatus(
          { botId, origin, phone },
          { stel_ssid, stel_tsession },
        )
        if (result) resolve(result)
        else setTimeout(process, 2000)
      } catch (err) {
        reject(err)
      }
    }
    setTimeout(process, 3000)
  })
}

async function getTelegramUser(
  { botId, origin, lang }: Omit<LoginViaTelegramParams, 'botNick'> & { lang: string },
  { stel_ssid }: Omit<TelegramAuthCookies, 'stel_tsession'>,
  { stel_token }: TelegramSessionToken,
) {
  const headers = new Headers()
  const formData = new FormData()
  headers.append('Cookie', `stel_ssid=${stel_ssid}; stel_token=${stel_token}`)
  headers.append('X-Requested-With', 'XMLHttpRequest')
  formData.append('origin', origin)
  const request = new Request(requestUserDataLink(botId, lang), {
    method: 'POST',
    body: formData,
    headers,
  })
  const response = await fetch(request)
  if (await checkResponseJSON(response)) {
    // if body data with tg user
    const data = await response.json()
    console.error('Login data', data)
    if (data.error) throw new Error(data.error)
    const telegramUser = data.user
    return telegramUser
  } else if (await checkResponseText(response)) {
    // if some error message
    const message = await response.text()
    console.error('Message from Telegram', message)
    throw new Error(message)
  } else {
    // if all fucked up
    throw new Error('Everything fucked up, dunno why :D')
  }
}
