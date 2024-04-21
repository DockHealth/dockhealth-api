'use strict'

/* Needed for standard.js to not complain about Jest global namespace functions. */
/* eslint-env jest */

/*
  The webhook events example requires additional setup, and an overview of the authorization process.
  Please see `WEBHOOKS.md` for more information on the webhook concepts.
  Please complete the `deprecated.webhook.test.js` example before proceeding to this example.
*/

const ngrok = require('@ngrok/ngrok')
const { beforeAll, expect, test } = require('@jest/globals')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const { customAlphabet: custom } = require('nanoid')
dayjs.extend(utc)

const shared = require('../../shared')
const request = require('supertest')(shared.apiUrl)

const secretGen = custom('abcdefghijklmnopqrstuvwxyz', 36)

beforeAll(() => {
  // Make sure all our env vars are set.
  shared.checkEnv()
})

// @deprecated
test('deprecated get events range', async () => {
  const token = await shared.getAccessToken([
    'dockhealth/system.developer.read',
    'dockhealth/system.developer.write'
  ])
  const headers = shared.deprecatedDevHeaders(token)

  const end = dayjs().utc().toISOString()
  const start = dayjs().utc().subtract(1, 'day').toISOString()
  const events = await deprecatedGetEventsRange(headers, start, end)
  console.debug(JSON.stringify(events, null, 2))
  expect(events.length).toBeGreaterThan(0)
})

// @deprecated
test('deprecated get event delivery range', async () => {
  const token = await shared.getAccessToken([
    'dockhealth/system.developer.read',
    'dockhealth/system.developer.write'
  ])
  const headers = shared.deprecatedDevHeaders(token)

  const end = dayjs().utc().toISOString()
  const start = dayjs().utc().subtract(1, 'day').toISOString()
  const attempts = await deprecatedGetEventDeliveryAttemptsRange(headers, start, end)
  console.debug(JSON.stringify(attempts, null, 2))
  expect(attempts.length).toBeGreaterThan(0)
})

// @deprecated
test('deprecated lifecycle', async () => {
  let tunnel = null
  let webhook = null
  let headers = null
  let err = null

  try {
    const token = await shared.getAccessToken([
      'dockhealth/system.developer.read',
      'dockhealth/system.developer.write',
      'dockhealth/user.all.read',
      'dockhealth/user.all.write'
    ])
    headers = shared.userAndOrgHeaders(token, shared.userIdentifier, shared.organizationIdentifier)

    // See how many events and event delivery attempts we already have.
    const beforeEvents = await deprecatedGetLatestEvents(headers)
    const beforeAttempts = await deprecatedGetLatestAttempts(headers)

    // Start our server listening through a proxy.
    let webhookUrl = null
    if (shared.callbackUrl) {
      webhookUrl = shared.callbackUrl
    } else {
      tunnel = await ngrok.connect({
        addr: Number(shared.callbackLocalPort),
        authtoken: shared.ngrokAuthtoken
      })
      webhookUrl = tunnel.url()
    }

    console.debug('Webhook URL: ' + webhookUrl)

    const webhookSecret = secretGen()
    await shared.startServer(webhookSecret)

    // Create a new webhook pointing to our ngrok proxy.
    webhook = await request
      .post('/api/v1/developer/webhook')
      .set(headers)
      .send({
        url: webhookUrl,
        secret: webhookSecret,
        enabled: true,
        events: ['UPDATE_ORGANIZATION', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER']
      })
      .expect(200)
      .then((res) => {
        console.debug('Created webhook: ' + JSON.stringify(res.body, null, 2))
        return res.body
      })

    expect(webhook.url).toEqual(webhookUrl)
    expect(webhook.secret).toEqual(webhookSecret)

    // Sleep a little to give the webhook time to be verified.
    await shared.sleep(5000)

    await request
      .get('/api/v1/developer/webhook/' + webhook.id)
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Verified webhook:' + JSON.stringify(res.body, null, 2))
        expect(res.body.id).toEqual(webhook.id)
        expect(res.body.verified).toBeTruthy()
      })

    // Update our organization and generate a new event.
    await request
      .patch(`/api/v1/organization/${shared.organizationIdentifier}`)
      .set(headers)
      .send({ identifier: shared.generateDomain() })
      .expect(200)
      .then(res => {
        console.debug('Updated organization: ' + JSON.stringify(res.body, null, 2))
        return res.body
      })

    // Sleep a little to give the webhook time to be called, and the results to be stored.
    await shared.sleep(5000)

    // See that we have one more event and event delivery attempt than before.
    let afterEvents = await deprecatedGetLatestEvents(headers)
    expect(afterEvents.length).toBeGreaterThan(beforeEvents.length)
    let afterAttempts = await deprecatedGetLatestAttempts(headers)
    expect(afterAttempts.length).toBeGreaterThan(beforeAttempts.length)

    // Create a new user and generate a new event.
    const email = shared.generateEmail()
    await request
      .post('/api/v1/user')
      .set(headers)
      .send({ email: email, firstName: 'John', lastName: email })
      .expect(200)
      .then(res => {
        console.debug('Created user: ' + JSON.stringify(res.body, null, 2))
        return res.body
      })

    // Sleep a little to give the webhook time to be called, and the results to be stored.
    await shared.sleep(5000)

    // See that we have one more event and event delivery attempt than before.
    afterEvents = await deprecatedGetLatestEvents(headers)
    expect(afterEvents.length).toBeGreaterThan(beforeEvents.length)
    afterAttempts = await deprecatedGetLatestAttempts(headers)
    expect(afterAttempts.length).toBeGreaterThan(beforeAttempts.length)
  } catch (error) {
    console.error('Error: ' + error.message)
    err = error
  } finally {
    // Delete the webhook, if created.
    await deprecatedDeleteWebhook(headers, webhook)

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

// @deprecated
const deprecatedGetLatestEvents = async (headers) => {
  const endTs = dayjs().utc().toISOString()
  const startTs = dayjs().utc().subtract(1, 'minute').toISOString()
  return await deprecatedGetEventsRange(headers, startTs, endTs)
}

// @deprecated
const deprecatedGetLatestAttempts = async (headers) => {
  const endTs = dayjs().utc().toISOString()
  const startTs = dayjs().utc().subtract(1, 'minute').toISOString()
  return await deprecatedGetEventDeliveryAttemptsRange(headers, startTs, endTs)
}

// @deprecated
const deprecatedGetEventsRange = async (headers, startTs, endTs) => {
  const url = encodeURI(`/api/v1/developer/event?organization=${shared.organizationIdentifier}&startTs=${startTs}&endTs=${endTs}`)
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Events: ' + JSON.stringify(res.body, null, 2))
      return res.body
    })
}

// @deprecated
const deprecatedGetEventDeliveryAttemptsRange = async (headers, startTs, endTs) => {
  const url = encodeURI(`/api/v1/developer/event/delivery?organization=${shared.organizationIdentifier}&startTs=${startTs}&endTs=${endTs}`)
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Event delivery attempts: ' + JSON.stringify(res.body, null, 2))
      return res.body
    })
}

// @deprecated
const deprecatedDeleteWebhook = async (headers, webhook) => {
  if (webhook) {
    await request
      .delete('/api/v1/developer/webhook/' + webhook.id)
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Deleted webhook:')
        console.debug(JSON.stringify(res.body, null, 2))
        expect(res.body.id).toEqual(webhook.id)
      })
  }
}
