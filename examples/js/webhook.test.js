'use strict'

/* Needed for standard.js to not complain about Jest global namespace functions. */
/* eslint-env jest */

/*
  The webhook example requires additional setup, and an overview of the authorization process.
  Please see `WEBHOOKS.md` for more information on the webhook concepts.

  Webhook authorization requires the developer to host a public-facing REST endpoint at the URL provided when
  setting up the webhook. Dock Health will call that endpoint with an authentication challenge, and the endpoint
  must return the properly-hashed and signed response.

  In order to facilitate running the example on localhost, the example code sets up a one-shot express.js REST server
  listening on `localhost:3000`. That port can be changed by setting `CALLBACK_LOCAL_PORT` in your environment.

  The example shows how to construct the response to the authentication challenge.
  See the code in `shared.js` for an example of constructing the challenge response.

  To make that endpoint available publicly, we recommend that you create a free ngrok account: <https://ngrok.com>.
  ngrok is a service that proxies a publicly-routable URL to an endpoint running locally in your environment.
*/

const shared = require('./shared')
const ngrok = require('ngrok')
const request = require('supertest')(shared.apiUrl)

beforeAll(() => {
  // Make sure all our env vars are set.
  shared.checkEnv()
})

afterAll(() => {
})

test('Get Webhooks', async () => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  const headers = shared.devHeaders(token)
  await request
    .get('/api/v1/developer/webhook')
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Fetched webhooks:')
      console.debug(JSON.stringify(res.body, null, 2))
    })
})

test('Authorize Webhook', async () => {
  // Generate the secret used for webhook verification.
  const secret = shared.generateWebhookIdentifier()

  // Start the one-shot express.js REST server listening (by default) on PORT 3000.
  shared.startServer(secret)

  let token = await shared.getAccessToken(['dockhealth/system.developer.write'])
  let headers = shared.devHeaders(token)
  let events = ['CREATE_ORGANIZATION']

  // Setup ngrok to proxy to our local server on port 3000.
  const ngrokOptions = {
    authtoken: shared.ngrokAuthtoken,
    proto: 'http',
    addr: Number(shared.callbackLocalPort)
  }
  const url = await ngrok.connect(ngrokOptions)
  console.debug('Webhook URL: ' + url)

  const id = await request
    .post('/api/v1/developer/webhook')
    .send({ url: url, secret: secret, events: events })
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Created unverified webhook:')
      console.debug(JSON.stringify(res.body, null, 2))
      expect(res.body.url).toEqual(url)
      expect(res.body.verified).not.toBeTruthy()
      return res.body.id
    })

  await shared.sleep(5000)

  token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  headers = shared.devHeaders(token)

  await request
    .get('/api/v1/developer/webhook/' + id)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Verified webhook:')
      console.debug(JSON.stringify(res.body, null, 2))
      expect(res.body.id).toEqual(id)
      expect(res.body.verified).toBeTruthy()
    })

  token = await shared.getAccessToken(['dockhealth/system.developer.write'])
  headers = shared.devHeaders(token)
  events = ['CREATE_ORGANIZATION', 'UPDATE_ORGANIZATION']

  await request
    .put('/api/v1/developer/webhook/' + id)
    .send({ url: url, secret: secret, events: events })
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Updated now-unverified webhook:')
      console.debug(JSON.stringify(res.body, null, 2))
      expect(res.body.id).toEqual(id)
      expect(res.body.verified).not.toBeTruthy()
    })

  await shared.sleep(5000)

  token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  headers = shared.devHeaders(token)

  await request
    .get('/api/v1/developer/webhook/' + id)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Verified updated webhook:')
      console.debug(JSON.stringify(res.body, null, 2))
      expect(res.body.id).toEqual(id)
      expect(res.body.verified).toBeTruthy()
    })

  token = await shared.getAccessToken(['dockhealth/system.developer.write'])
  headers = shared.devHeaders(token)

  await request
    .delete('/api/v1/developer/webhook/' + id)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Deleted webhook:')
      console.debug(JSON.stringify(res.body, null, 2))
      expect(res.body.id).toEqual(id)
    })

  // Disconnect the ngrok proxy.
  await ngrok.disconnect()

  // Stop our one-shot express.js REST server.
  shared.stopServer()
  await shared.sleep(100)
})
