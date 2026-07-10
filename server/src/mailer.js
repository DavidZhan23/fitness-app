import net from 'node:net'
import tls from 'node:tls'

function readEnv(name) {
  return process.env[name]?.trim() ?? ''
}

function smtpConfigured() {
  return Boolean(readEnv('SMTP_HOST') && readEnv('SMTP_FROM'))
}

function isLocalDev() {
  return process.env.NODE_ENV !== 'production'
}

function encodeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64')
}

function escapeAddress(address) {
  return String(address).replace(/[<>\r\n]/g, '').trim()
}

export function extractEmailAddress(address) {
  const raw = String(address ?? '').trim()
  const angleMatch = raw.match(/<([^<>\s]+@[^<>\s]+)>/)
  if (angleMatch) return angleMatch[1].trim()
  const plainMatch = raw.match(/[^\s<>,;]+@[^\s<>,;]+/)
  return plainMatch?.[0]?.trim() ?? ''
}

function formatMessage({ from, to, subject, text }) {
  const safeFrom = escapeAddress(from)
  const safeTo = escapeAddress(to)
  const lines = [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: =?UTF-8?B?${encodeBase64(subject)}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
  ]
  return `${lines.join('\r\n').replace(/^\./gm, '..')}\r\n.`
}

function createSmtpClient({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port })
    socket.setEncoding('utf8')
    socket.setTimeout(20_000)
    socket.once('error', reject)
    socket.once('timeout', () => {
      socket.destroy(new Error('SMTP connection timed out'))
    })
    socket.once(secure ? 'secureConnect' : 'connect', () => resolve(socket))
  })
}

function readResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const onData = (chunk) => {
      buffer += chunk
      const lines = buffer.split(/\r?\n/).filter(Boolean)
      const last = lines.at(-1)
      if (last && /^\d{3} /.test(last)) {
        cleanup()
        const code = Number(last.slice(0, 3))
        resolve({ code, message: buffer })
      }
    }
    const onError = (err) => {
      cleanup()
      reject(err)
    }
    const cleanup = () => {
      socket.off('data', onData)
      socket.off('error', onError)
    }
    socket.on('data', onData)
    socket.once('error', onError)
  })
}

async function expect(socket, codes) {
  const response = await readResponse(socket)
  if (!codes.includes(response.code)) {
    throw new Error(`SMTP unexpected response ${response.code}: ${response.message}`)
  }
  return response
}

async function sendCommand(socket, command, codes) {
  socket.write(`${command}\r\n`)
  return expect(socket, codes)
}

async function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket, servername: host }, () => {
      secureSocket.setEncoding('utf8')
      resolve(secureSocket)
    })
    secureSocket.once('error', reject)
  })
}

export async function sendPasswordResetEmail({ to, resetUrl, expiresAt }) {
  const from = readEnv('SMTP_FROM')
  if (!smtpConfigured()) {
    if (isLocalDev()) {
      console.log(`[mail:dev] Password reset for ${to}: ${resetUrl}`)
      return { delivered: false, mode: 'log' }
    }
    const err = new Error('邮件服务未配置，请设置 SMTP_HOST 和 SMTP_FROM')
    err.status = 500
    throw err
  }

  const host = readEnv('SMTP_HOST')
  const port = Number(readEnv('SMTP_PORT') || 587)
  const secure = readEnv('SMTP_SECURE') === '1' || port === 465
  const user = readEnv('SMTP_USER')
  const pass = readEnv('SMTP_PASS')
  const envelopeFrom = extractEmailAddress(from)
  if (!envelopeFrom) {
    const err = new Error('SMTP_FROM 必须包含有效邮箱地址')
    err.status = 503
    throw err
  }
  let socket = await createSmtpClient({ host, port, secure })

  try {
    await expect(socket, [220])
    await sendCommand(socket, `EHLO ${readEnv('SMTP_HELO') || 'localhost'}`, [250])
    if (!secure && readEnv('SMTP_STARTTLS') !== '0') {
      await sendCommand(socket, 'STARTTLS', [220])
      socket = await upgradeToTls(socket, host)
      await sendCommand(socket, `EHLO ${readEnv('SMTP_HELO') || 'localhost'}`, [
        250,
      ])
    }
    if (user && pass) {
      await sendCommand(socket, 'AUTH LOGIN', [334])
      await sendCommand(socket, encodeBase64(user), [334])
      await sendCommand(socket, encodeBase64(pass), [235])
    }
    await sendCommand(socket, `MAIL FROM:<${escapeAddress(envelopeFrom)}>`, [250])
    await sendCommand(socket, `RCPT TO:<${escapeAddress(to)}>`, [250, 251])
    await sendCommand(socket, 'DATA', [354])
    socket.write(
      `${formatMessage({
        from,
        to,
        subject: '重置满打满算密码',
        text: [
          '你正在重置满打满算账号密码。',
          '',
          `请在 ${new Date(expiresAt).toLocaleString('zh-CN', {
            hour12: false,
          })} 前打开下面的链接设置新密码：`,
          resetUrl,
          '',
          '如果不是你本人操作，可以忽略这封邮件。',
        ].join('\n'),
      })}\r\n`,
    )
    await expect(socket, [250])
    await sendCommand(socket, 'QUIT', [221])
    return { delivered: true, mode: 'smtp' }
  } catch (err) {
    err.status = err.status || 503
    throw err
  } finally {
    socket.end()
  }
}
