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

  Alternatively, you can use an existing proxy url by setting CALLBACK_URL in your environment.
*/

const ngrok = require('@ngrok/ngrok')
const { beforeAll, test, expect } = require('@jest/globals')

const shared = require('../../shared')
const request = require('supertest')(shared.apiUrl)

beforeAll(() => {
  // Make sure all our env vars are set.
  shared.checkEnv()
})

test('Get Webhooks', async () => {
  const token = await shared.getAccessToken([
    'dockhealth/user.all.read',
    'dockhealth/user.all.write'
  ])
  const headers = shared.userAndOrgHeaders(token, shared.userIdentifier, shared.organizationIdentifier)

  await request
    .get('/api/v1/webhook')
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Fetched webhooks:')
      console.debug(JSON.stringify(res.body, null, 2))
    })
})

test('Authorize Webhook', async () => {
  let id = null
  let headers = null
  let tunnel = null
  let err = null

  try {
    // Generate the secret used for webhook verification.
    const secret = shared.generateWebhookIdentifier()

    // Start the one-shot express.js REST server listening (by default) on PORT 3000.
    shared.startServer(secret)

    // Setup ngrok or use an existing proxy to our local server on port 3000.
    let url = null
    if (shared.callbackUrl) {
      url = shared.callbackUrl
    } else {
      tunnel = await ngrok.connect({
        addr: Number(shared.callbackLocalPort),
        authtoken: shared.ngrokAuthtoken
      })
      url = tunnel.url()
    }

    console.debug(`Webhook URL: ${url}`)

    const token = await shared.getAccessToken([
      'dockhealth/user.all.read',
      'dockhealth/user.all.write'
    ])
    headers = shared.userAndOrgHeaders(token, shared.userIdentifier, shared.organizationIdentifier)

    // Create the webhook, which will be verified asynchronously.
    id = await request
      .post('/api/v1/webhook')
      .send({ url: url, secret: secret, events: ['CREATE_ORGANIZATION'] })
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

    await request
      .get('/api/v1/webhook/' + id)
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Verified webhook:')
        console.debug(JSON.stringify(res.body, null, 2))
        expect(res.body.id).toEqual(id)
        expect(res.body.verified).toBeTruthy()
      })

    // Updating the webhook will require re-validation.
    await request
      .put('/api/v1/webhook/' + id)
      .send({ url: url, secret: secret, events: ['CREATE_ORGANIZATION', 'UPDATE_ORGANIZATION'] })
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Updated webhook (re-verification required):')
        console.debug(JSON.stringify(res.body, null, 2))
        expect(res.body.id).toEqual(id)
        expect(res.body.verified).not.toBeTruthy()
      })

    await shared.sleep(5000)

    await request
      .get('/api/v1/webhook/' + id)
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Re-verified webhook:')
        console.debug(JSON.stringify(res.body, null, 2))
        expect(res.body.id).toEqual(id)
        expect(res.body.verified).toBeTruthy()
      })
  } catch (error) {
    console.error(error)
    err = error
  } finally {
    // Delete the webhook, if created.
    await deleteWebhook(id, headers)

    // Stop our one-shot express.js REST server.
    await shared.stopServer()

    // Disconnect the tunnel, if connected.
    if (tunnel) {
      await ngrok.disconnect()
      await ngrok.kill()
    }

    if (err) {
      // eslint-disable-next-line no-unsafe-finally
      throw err
    }
  }
})

const deleteWebhook = async (id, headers) => {
  if (id) {
    await request
      .delete('/api/v1/webhook/' + id)
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Deleted webhook:')
        console.debug(JSON.stringify(res.body, null, 2))
        expect(res.body.id).toEqual(id)
      })
  }
}
