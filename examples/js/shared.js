'use strict'

/* Needed for standard.js to not complain about Jest global namespace functions. */
/* eslint-env jest */

// Must add to prevent CORS error when axios unwinds error response in Jest tests.
global.XMLHttpRequest = undefined

jest.setTimeout(360000) // 360 secs.

if (process.env.NODE_ENV !== 'production') {
  require('custom-env').env(process.env.NODE_ENV)
}

const HEADER_AUTHORIZATION = 'Authorization'
const HEADER_API_KEY = 'x-api-key'
const HEADER_USER_ID = 'x-user-id'
const HEADER_ORGANIZATION_ID = 'x-organization-id'
const GENERATED_ITEM_LENGTH = 8

const authUrl = process.env.AUTH_URL
const apiUrl = process.env.API_URL
const apiKey = process.env.API_KEY
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const domain = process.env.DOMAIN
const email = process.env.EMAIL

const taskListIdentifier = process.env.TASK_LIST_IDENTIFIER
const organizationIdentifier = process.env.ORGANIZATION_IDENTIFIER
const userIdentifier = process.env.USER_IDENTIFIER
const taskGroupIdentifier = process.env.TASK_GROUP_IDENTIFIER

// NOTE: Use ngrok to proxy calls from a well-known domain and port to localhost.
// Set CALLBACK_LOCAL_PORT in your environment to the port of
// your express instance setup in shared.js (default is 3000).
// See: https://ngrok.com
const callbackLocalPort = process.env.CALLBACK_LOCAL_PORT
const ngrokAuthtoken = process.env.NGROK_AUTHTOKEN

const _ = require('lodash')
const auth = require('supertest')(authUrl)
const crypto = require('crypto')
const express = require('express')
const { nanoid } = require('nanoid')

let server = null
let serverSecret = null
const app = express()
app.use(express.json())

const checkEnv = () => {
  if (!authUrl) {
    throw new Error('AUTH_URL is undefined!')
  }
  if (!apiUrl) {
    throw new Error('API_URL is undefined!')
  }
  if (!apiKey) {
    throw new Error('API_KEY is undefined!')
  }
  if (!clientId) {
    throw new Error('CLIENT_ID is undefined!')
  }
  if (!clientSecret) {
    throw new Error('CLIENT_SECRET is undefined!')
  }
  if (!domain) {
    throw new Error('DOMAIN is undefined!')
  }
  if (!email) {
    throw new Error('EMAIL is undefined!')
  }
  if (!callbackLocalPort) {
    throw new Error('CALLBACK_LOCAL_PORT is undefined!')
  }
  if (!ngrokAuthtoken) {
    throw new Error('NGROK_AUTHTOKEN is undefined!')
  }
}

// Start the express.js REST server to respond to a webhook verification challenge.
const startServer = (secret) => {
  server = app.listen(callbackLocalPort, () => {
    console.log(`Webhook callback server listening on ${callbackLocalPort}`)
    serverSecret = secret
  })
}

// Stop the REST server.
const stopServer = () => {
  if (server) {
    server.close()
  }
  console.log('Webhook callback server stopped')
  serverSecret = null
}

// Listen for a webhook verification challenge and return a signed response.
app.get('/*', async (req, res) => {
  if (!req.query.message) {
    console.log('Webhook called with empty message!')
    return res.status(400)
  }
  const message = req.query.message
  console.log(`Webhook called with message: ${message}`)
  const signed = await sign(message)
  if (!signed) {
    console.log('Unable to sign message!')
    return res.status(500)
  }
  console.log('Returning signed message digest: ' + signed)
  return res.status(200).send({ digest: signed })
})

app.post('/*', async (req, res) => {
  try {
    if (!req.headers) {
      console.debug('Webhook called with empty headers!')
      return res.status(400)
    }
    const headers = req.headers
    console.debug(`Webhook headers: ${JSON.stringify(headers)}.`)

    if (!req.body) {
      console.debug('Webhook called with empty event!')
      return res.status(400)
    }
    const event = req.body
    console.debug('Webhook event:')
    console.debug(event)

    // IMPORTANT: HTTP headers are case-insensitive!
    const lowered = _.mapKeys(headers, (v, k) => k.toLowerCase())
    const header = lowered['x-dock-signature-256']
    if (!header) {
      console.error('X-Dock-Signature-256 header missing.')
      return res.status(500)
    }

    const elems = header.split(',')
    if (elems.length < 2) {
      console.error('Malformed X-Dock-Signature-256 header.')
      return res.status(400)
    }

    const tsElem = elems[0].split('=')
    if (tsElem.length < 2) {
      console.error('Malformed timestamp header element.')
      return res.status(400)
    }

    const signatureElem = elems[1].split('=')
    if (signatureElem.length < 2) {
      console.error('Malformed signature header element.')
      return res.status(400)
    }

    const ts = tsElem[1]
    if (!ts) {
      console.error('Missing timestamp.')
      return res.status(400)
    }

    const buffer = JSON.stringify(event)
    const signature = signatureElem[1]
    const verificationSignature = await crypto.createHmac('sha256', serverSecret).update(buffer).digest('hex')
    if (!verificationSignature) {
      console.error('Unable to create verification signature!')
      return res.status(500)
    }

    if (signature !== verificationSignature) {
      console.error('Signature invalid.')
      return res.status(400)
    }
    console.debug('Signature valid.')

    console.debug('Successfully processed event.')
    return res.status(200).send({ })
  } catch (error) {
    console.error(`Error processing event: ${error.message}.`)
    return res.status(500)
  }
})

const devHeaders = (token) => {
  if (!token) {
    throw new Error('Token is undefined!')
  }
  const json = {}
  json[HEADER_AUTHORIZATION] = token
  json[HEADER_API_KEY] = apiKey
  return json
}

const userHeaders = (token, userId) => {
  if (!token) {
    throw new Error('Token is undefined!')
  }
  if (!userId) {
    throw new Error('User id is undefined!')
  }
  const json = {}
  json[HEADER_AUTHORIZATION] = token
  json[HEADER_API_KEY] = apiKey
  json[HEADER_USER_ID] = userId
  return json
}

const userAndOrgHeaders = (token, userId, organizationId) => {
  if (!token) {
    throw new Error('Token is undefined!')
  }
  if (!userId) {
    throw new Error('User id is undefined!')
  }
  if (!organizationId) {
    throw new Error('Organization id is undefined!')
  }
  const json = {}
  json[HEADER_AUTHORIZATION] = token
  json[HEADER_API_KEY] = apiKey
  json[HEADER_USER_ID] = userId
  json[HEADER_ORGANIZATION_ID] = organizationId
  return json
}

const generateEmail = () => {
  return (nanoid(GENERATED_ITEM_LENGTH) + '@' + domain).toLowerCase()
}

const generateDomain = () => {
  return (nanoid(GENERATED_ITEM_LENGTH) + '.' + domain).toLowerCase()
}

const generateMrn = () => {
  return (nanoid(GENERATED_ITEM_LENGTH) + '-' + domain).toLowerCase()
}

const generateWebhookIdentifier = () => {
  return (nanoid(36)).toLowerCase()
}

const getAccessToken = async (scopes) => {
  if (!apiKey) {
    throw new Error('API_KEY is not set in the environment!')
  }
  if (!clientId) {
    throw new Error('CLIENT_ID is not set in the environment!')
  }
  if (!clientSecret) {
    throw new Error('CLIENT_ID is not set in the environment!')
  }
  if (!scopes || scopes.length === 0) {
    throw new Error('Scopes are not defined!')
  }

  // Uncomment for debugging purposes.
  // console.debug('Requesting token for scopes: ' + scopes.join(' '))
  // console.debug('Auth URL: ' + authUrl)

  return await auth
    .post('/oauth2/token')
    .type('form')
    .send({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes.join(' ') // IMPORTANT: Scopes MUST be SPACE delimited or call will fail!
    })
    .expect(200)
    .then(res => {
      // Uncomment for debugging purposes.
      // console.debug('Access token: ' + res.body.access_token)
      return res.body.access_token
    })
}

const sign = async (message) => {
  if (!message) {
    return null
  }
  // Create a SHA-256 hash of the message using the `secret` supplied to Dock Health when creating the webhook.
  // Return an HMAC HEX digest of the hash.
  console.log('Signing message: ' + message)
  return crypto.createHmac('sha256', serverSecret).update(message).digest('hex')
}

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

module.exports = {
  HEADER_API_KEY,
  HEADER_AUTHORIZATION,
  HEADER_ORGANIZATION_ID,
  HEADER_USER_ID,
  apiUrl,
  callbackLocalPort,
  ngrokAuthtoken,
  checkEnv,
  devHeaders,
  domain,
  email,
  generateDomain,
  generateEmail,
  generateMrn,
  generateWebhookIdentifier,
  getAccessToken,
  sleep,
  startServer,
  stopServer,
  userAndOrgHeaders,
  userHeaders,
  userIdentifier,
  organizationIdentifier,
  taskListIdentifier,
  taskGroupIdentifier
}
