/* global Request FormData fetch Headers */
/* eslint-disable camelcase */

const debug = require('debug')('telegram-login')

const checkResponseJSON = response => response.clone().json().then(() => true).catch(() => false)
const checkResponseText = response => response.clone().text().then(() => true).catch(() => false)

/**
 * Params:
 * botId
 * origin
 * phone format string +1234567890
 */

module.exports = async function loginViaTelegram (params) {
  try {
    const cookies = await requestTelegramLogin(params)
    const token = await loginStatusCheck(params, cookies)
    const tgUser = await getTelegramUser(params, cookies, token)
    return tgUser
  } catch (error) {
    debug('Login to telegram failed', error)
    throw error
  }
}

async function requestTelegramLogin ({ phone, botId, origin }) {
  debug('Requestiong telegram login')
  let response
  const formData = new FormData()
  try {
    formData.append('phone', phone.replace(/\+/g, ''))
    const request = new Request(`https://oauth.telegram.org/auth/request?bot_id=${botId}&origin=${encodeURIComponent(origin)}&request_access=write`, {
      method: 'POST',
      body: formData
    })
    response = await fetch(request)
  } catch (err) {
    throw new Error('Network connection error')
  }
  if (response.status === 200) {
    if (await checkResponseJSON(response)) {
      const success = await response.json()
      if (success) {
        const cookie = response.headers.get('set-cookie')
        const stel_ssid = /(?:stel_ssid=)(\S+)(?=;)/.exec(cookie)[1]
        const stel_tsession = /(?:stel_tsession=)(\S+)(?=;)/.exec(cookie)[1]
        return { stel_ssid, stel_tsession }
      }
    } else if (await checkResponseText(response)) {
      const message = await response.text()
      throw new Error(message)
    } else {
      throw new Error('Connection error')
    }
  }
}

async function checkTelegramLoginStatus ({ phone, botId, origin }, { stel_ssid, stel_tsession }) {
  debug('Checking login status...')
  if (!stel_ssid || !stel_tsession) return
  let response
  try {
    const headers = new Headers()
    headers.append('Cookie', `stel_ssid=${stel_ssid}; stel_tsession_${phone}=${stel_tsession}; stel_tsession=${stel_tsession}`)
    // headers.append('stel_tsession', stel_tsession)
    // headers.append(`stel_tsession_${phone.replace(/\+/g, '')}`, stel_tsession)
    const request = new Request(`https://oauth.telegram.org/auth/login?bot_id=${botId}&origin=${encodeURIComponent(origin)}`, {
      method: 'POST',
      headers
    })
    response = await fetch(request)
  } catch (err) {
    throw new Error('Network error')
  }

  if (await checkResponseJSON(response)) {
    const status = await response.clone().json()
    if (!status) {
      return false
    } else {
      const cookie = response.headers.get('set-cookie')
      const stel_token = /(?:stel_token=)(\S+)(?=;)/.exec(cookie)[1]
      return { stel_token }
    }
  } else if (await checkResponseText(response)) {
    const message = await response.text()
    if (message === 'Session expired') {
      throw new Error(message)
    } else {
      throw new Error('Unexpected server response')
    }
  } else {
    throw new Error('Unexpected error')
  }
}

function loginStatusCheck (params, cookies) {
  return new Promise((resolve, reject) => {
    const process = async () => {
      try {
        const result = await checkTelegramLoginStatus(params, cookies)
        if (result) resolve(result)
        else setTimeout(process, 2000)
      } catch (err) {
        reject(err)
      }
    }
    setTimeout(process, 3000)
  })
}

async function getTelegramUser ({ botId, origin }, { stel_ssid }, { stel_token }) {
  const headers = new Headers()
  const formData = new FormData()
  headers.append('Cookie', `stel_ssid=${stel_ssid}; stel_token=${stel_token}`)
  headers.append('X-Requested-With', 'XMLHttpRequest')
  formData.append('origin', origin)
  const request = new Request(`https://oauth.telegram.org/auth/get?bot_id=${botId}&lang=en`, {
    method: 'POST',
    body: formData,
    headers
  })
  const response = await fetch(request)
  if (await checkResponseJSON(response)) { // if body data with tg user
    const data = await response.json()
    debug('Login data', data)
    if (data.error) throw new Error(data.error)
    const telegramUser = data.user
    return telegramUser
  } else if (await checkResponseText(response)) { // if some error message
    const message = await response.text()
    debug('Message from Telegram', message)
    throw new Error(message)
  } else { // if all fucked up
    throw new Error('Everything fucked up, dunno why :D')
  }
}
