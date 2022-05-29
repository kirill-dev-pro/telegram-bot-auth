export interface LoginViaTelegramParams {
  botId: number
  botNick: string
  origin: string
  phone: string
  lang?: string
}

export interface TelegramAuthCookies {
  stel_ssid: string
  stel_tsession: string
}

export interface TelegramSessionToken {
  stel_token: string
}
