'use strict'

/* Needed for standard.js to not complain about Jest global namespace functions. */
/* eslint-env jest */

/*
  The webhook events example requires additional setup, and an overview of the authorization process.
  Please see `WEBHOOKS.md` for more information on the webhook concepts.
  Please complete the `webhook.test.js` example before proceeding to this example.
*/

const ngrok = require('ngrok')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)
const { customAlphabet: custom } = require('nanoid')

const shared = require('./shared')
const request = require('supertest')(shared.apiUrl)

const secretGen = custom('abcdefghijklmnopqrstuvwxyz', 36)

beforeAll(() => {
  // Make sure all our env vars are set.
  shared.checkEnv()
})

test('get events range', async () => {
  const organizationIdentifier = await getDefaultOrganizationIdentifier()

  const end = dayjs().utc().toISOString()
  const start = dayjs().utc().subtract(1, 'day').toISOString()
  const events = await getEventsRange(organizationIdentifier, start, end)
  console.debug(JSON.stringify(events))
  expect(events.length).toBeGreaterThan(0)
})

test('get event delivery range', async () => {
  const organizationIdentifier = await getDefaultOrganizationIdentifier()

  const end = dayjs().utc().toISOString()
  const start = dayjs().utc().subtract(1, 'day').toISOString()
  const attempts = await getEventDeliveryAttemptsRange(organizationIdentifier, start, end)
  console.debug(JSON.stringify(attempts))
  expect(attempts.length).toBeGreaterThan(0)
})

test('lifecycle', async () => {
  try {
    // Get the organization identifier matching the domain used when setting up our account.
    const organizationIdentifier = await getDefaultOrganizationIdentifier()

    // Get the user identifier matching the email address used when setting up our account.
    const userIdentifier = await getDefaultUserIdentifier(organizationIdentifier)

    // Delete any existing webhooks, just to keep things manageable.
    const existing = await getWebhooks()
    await deleteWebhooks(existing)

    // See how many events and event delivery attempts we already have.
    const beforeEvents = await getTodayEvents(organizationIdentifier)
    const beforeAttempts = await getTodayAttempts(organizationIdentifier)

    // Start our server listening through an ngrok proxy.
    const ngrokOptions = {
      authtoken: shared.ngrokAuthtoken,
      proto: 'http',
      addr: Number(shared.callbackLocalPort)
    }
    const webhookUrl = await ngrok.connect(ngrokOptions)
    console.debug('Webhook URL: ' + webhookUrl)
    const webhookSecret = secretGen()
    await shared.startServer(webhookSecret)

    // Create a new webhook pointing to our ngrok proxy.
    const eventTypes = ['UPDATE_ORGANIZATION', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER']
    const webhook = await createWebhook(webhookUrl, webhookSecret, eventTypes)
    expect(webhook.url).toEqual(webhookUrl)
    expect(webhook.secret).toEqual(webhookSecret)

    // Update our organization and generate a new event.
    const updatedOrganization = await updateOrganization(organizationIdentifier, userIdentifier)
    console.debug('UPDATED ORGANIZATION: ' + JSON.stringify(updatedOrganization))

    // Sleep a little to give the webhook time to be called,
    // and the results to be stored.
    await shared.sleep(5000)

    // See that we have one more event and event delivery attempts than before.
    let afterEvents = await getTodayEvents(organizationIdentifier)
    expect(afterEvents.length).toBeGreaterThan(beforeEvents.length)
    let afterAttempts = await getTodayAttempts(organizationIdentifier)
    expect(afterAttempts.length).toBeGreaterThan(beforeAttempts.length)

    // Create a new user and generate a new event.
    const newUser = await createUser(organizationIdentifier, userIdentifier)
    console.debug('CREATED USER: ' + JSON.stringify(newUser))

    // Sleep a little to give the webhook time to be called,
    // and the results to be stored.
    await shared.sleep(5000)

    // See that we have one more event and event delivery attempts than before.
    afterEvents = await getTodayEvents(organizationIdentifier)
    expect(afterEvents.length).toBeGreaterThan(beforeEvents.length)
    afterAttempts = await getTodayAttempts(organizationIdentifier)
    expect(afterAttempts.length).toBeGreaterThan(beforeAttempts.length)
  } catch (error) {
    console.error('Error: ' + error.message)
    throw error
  } finally {
    await ngrok.disconnect()
    // await ngrok.kill()
    await shared.stopServer()
  }
})

const getTodayEvents = async (organizationIdentifier) => {
  const endTs = dayjs().utc().toISOString()
  const startTs = dayjs().utc().subtract(1, 'day').toISOString()
  const events = await getEventsRange(organizationIdentifier, startTs, endTs)
  console.debug(`EVENTS (${events.length}): ${JSON.stringify(events)}.`)
  return events
}

const getTodayAttempts = async (organizationIdentifier) => {
  const endTs = dayjs().utc().toISOString()
  const startTs = dayjs().utc().subtract(1, 'day').toISOString()
  const events = await getEventDeliveryAttemptsRange(organizationIdentifier, startTs, endTs)
  console.debug(`ATTEMPTS (${events.length}): ${JSON.stringify(events)}.`)
  return events
}

const confirmEventDelivery = async (organizationIdentifier, events) => {
  const newEvent = events[events.length - 1]
  const attempts = await getEventDeliveryAttempts(organizationIdentifier, newEvent.eventIdentifier)
  expect(attempts.length).toBeGreaterThan(0)
  expect(attempts[0].eventIdentifier).toEqual(newEvent.eventIdentifier)
}

const getDefaultOrganizationIdentifier = async () => {
  const token = await shared.getAccessToken(['dockhealth/system.org.read'])
  const headers = shared.devHeaders(token)
  const url = encodeURI('/api/v1/developer/organization')
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Organizations: ' + JSON.stringify(res.body))
      const organization = res.body.find(org => org.domain === shared.domain)
      if (!organization) {
        throw Error('Default organization not found: ' + shared.domain)
      }
      console.debug('Default organization: ' + organization.domain)
      return organization.id
    })
}

const getDefaultUserIdentifier = async (organizationIdentifier) => {
  const token = await shared.getAccessToken(['dockhealth/system.user.read'])
  const headers = shared.devHeaders(token)
  const url = encodeURI(`/api/v1/developer/user?organization=${organizationIdentifier}`)
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Users: ' + JSON.stringify(res.body))
      const user = res.body.find(u => u.email === shared.email)
      if (!user) {
        throw Error('Default user not found: ' + shared.email)
      }
      console.debug('Default user: ' + user.email)
      return user.id
    })
}

const getEvents = async (organizationIdentifier, eventIdentifier) => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  const headers = shared.devHeaders(token)
  const url = encodeURI(`/api/v1/developer/event?organization=${organizationIdentifier}&event=${eventIdentifier}`)
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Events: ' + JSON.stringify(res.body))
      return res.body
    })
}

const getEventsRange = async (organizationIdentifier, startTs, endTs) => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  const headers = shared.devHeaders(token)
  const url = encodeURI(`/api/v1/developer/event?organization=${organizationIdentifier}&startTs=${startTs}&endTs=${endTs}`)
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Events: ' + JSON.stringify(res.body))
      return res.body
    })
}

const getEventDeliveryAttempts = async (organizationIdentifier, eventIdentifier) => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  const headers = shared.devHeaders(token)
  const url = encodeURI(`/api/v1/developer/event/delivery?organization=${organizationIdentifier}&event=${eventIdentifier}`)
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Event delivery attempts: ' + JSON.stringify(res.body))
      return res.body
    })
}

const getEventDeliveryAttemptsRange = async (organizationIdentifier, startTs, endTs) => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  const headers = shared.devHeaders(token)
  const url = encodeURI(`/api/v1/developer/event/delivery?organization=${organizationIdentifier}&startTs=${startTs}&endTs=${endTs}`)
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Event delivery attempts: ' + JSON.stringify(res.body))
      return res.body
    })
}

const getWebhooks = async () => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.read'])
  const headers = shared.devHeaders(token)
  const url = encodeURI('/api/v1/developer/webhook')
  return await request
    .get(url)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Webhooks: ' + JSON.stringify(res.body))
      return res.body
    })
}

const createWebhook = async (webhookUrl, webhookSecret, eventTypes) => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.write'])
  const headers = shared.devHeaders(token)
  const url = encodeURI('/api/v1/developer/webhook')
  const body = {
    url: webhookUrl,
    secret: webhookSecret,
    enabled: true,
    events: eventTypes
  }
  return await request
    .post(url)
    .set(headers)
    .send(body)
    .expect(200)
    .then((res) => {
      console.debug('Created webhook: ' + JSON.stringify(res.body))
      return res.body
    })
}

const deleteWebhooks = async (webhooks) => {
  for (let i = 0; i < webhooks.length; i++) {
    await deleteWebhook(webhooks[i])
  }
}

const deleteWebhook = async (webhook) => {
  const token = await shared.getAccessToken(['dockhealth/system.developer.write'])
  const headers = shared.devHeaders(token)
  const url = encodeURI(`/api/v1/developer/webhook/${webhook.id}`)
  return await request
    .delete(url)
    .set(headers)
    .expect(200)
    .then((res) => {
      console.debug('Deleted webhook: ' + JSON.stringify(res.body))
      return res.body
    })
}

const updateOrganization = async (organizationIdentifier, userIdentifier) => {
  const name = shared.generateDomain()
  const token = await shared.getAccessToken(['dockhealth/user.all.write'])
  const headers = shared.userHeaders(token, userIdentifier)
  const url = encodeURI(`/api/v1/organization/${organizationIdentifier}`)
  return await request
    .patch(url)
    .set(headers)
    .send({ name: name })
    .expect(200)
    .then(res => {
      console.debug('Updated organization: ' + JSON.stringify(res.body))
      return res.body
    })
}

const createUser = async (organizationIdentifier, userIdentifier) => {
  const email = shared.generateEmail()
  const token = await shared.getAccessToken(['dockhealth/user.all.write'])
  const headers = shared.userAndOrgHeaders(token, userIdentifier, organizationIdentifier)
  const url = encodeURI('/api/v1/user')
  return await request
    .post(url)
    .set(headers)
    .send({ email: email, firstName: 'John', lastName: email })
    .expect(200)
    .then(res => {
      console.debug('Created user: ' + JSON.stringify(res.body))
      return res.body
    })
}
