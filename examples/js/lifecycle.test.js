'use strict'

/* Needed for standard.js to not complain about Jest global namespace functions. */
/* eslint-env jest */

const shared = require('./shared')
const request = require('supertest')(shared.apiUrl)

test('Dock Health API Lifecycle Test.', async () => {

  // This test demonstrates the full Dock Health onboarding lifecycle.

  console.debug('Running Dock Health API Lifecycle Test.')
  console.debug('Environment: ' + process.env.NODE_ENV)

  // All requests require you to first fetch an access token for your desired scope(s).
  // The scopes associated with the token must match the scopes required for the API endpoint then called.
  // This example will document most of those scopes, but always refer to the API references listed
  // in the README files in this repo for the specified scopes required for each endpoint.

  // This token can be reused for the requested scopes until it expires,
  // but it is good security practice to request the minimum scope necessary for a specified request,
  // and request a new token for each different scope required.

  // This example assumes that the tokens will not expire during the life of the example,
  // but in real-world usage you should expect to have to re-request tokens when they expire,
  // or request a new token with each API request.

  let token = await shared.getAccessToken(['dockhealth/system.developer.read'])

  // `/developer` endpoints (all endpoints, actually) require you to set at least two headers:
  // An `Authorization` header set to the access token appropriate for the endpoint.
  // An `x-api-key` header set to the `API_KEY` you received from Dock Health.
  // See the `shared.userHeaders()` convenience method for an example of setting the appropriate headers.

  let headers = shared.devHeaders(token)

  // Fetch your developer account information.
  await request
    .get('/api/v1/developer')
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Fetched developer account info:')
      console.debug(res.body)
    })

  // Fetch the list of the organizations associated with your developer account.
  // Initially, there will be just the single organization you setup when creating your initial account with Dock Health.

  // This requires a different scope.

  token = await shared.getAccessToken(['dockhealth/system.org.read'])
  headers = shared.devHeaders(token)

  // Store the organization id of your organization for use in our next request, below....
  // NOTE: If your developer account is associated with more than one organization,
  // and you wish to use a different organization for subsequent requests, store the id of that organization instead.

  const orgId =
    await request
      .get('/api/v1/developer/organization')
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Fetched developer organizations:')
        console.debug(res.body)
        return res.body[0].id
      })

  // Fetch the list of the users associated with your organization.
  // Initially, there will be just the single user you setup when creating your initial account with Dock Health.
  // That user will typically be the organization owner.

  // This requires a different scope.

  token = await shared.getAccessToken(['dockhealth/system.user.read'])
  headers = shared.devHeaders(token)

  // Store the user id of that user for use in our next request, below....
  // NOTE: If your organization contains more than one user, and you wish to use a different user for subsequent
  // requests, store the id of that user instead.

  const userId = await request
    .get('/api/v1/developer/user?organization=' + orgId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Fetched users for organization: ' + orgId)
      console.debug(res.body)
      return res.body[0].id
    })

  // Using this user, create a new organization to be associated with your developer account.
  // This user will be the owner of this new organization.

  // This requires a different scope.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])

  // `/organization` endpoints an additional `x-user-id` header set to the id of the user making the request.
  // See the `shared.userHeaders()` convenience method for an example of setting the appropriate headers.

  headers = shared.userHeaders(token, userId)

  // You must supply an domain name for the new organization, and that domain name must be unique across all of Dock Health.
  // To make it easier to guarantee a unique domain name, we will generate one here.
  // In real life, you should use your organization's domain name, which will be unique.

  let domain = shared.generateDomain()

  // Create a new organization and store the returned id for later use.

  const newOrgId =
    await request
      .post('/organization')
      .send({ domain: domain, name: 'org-name-' + domain })
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Created new organization: ' + domain)
        console.debug(res.body)
        expect(res.body.domain).toEqual(domain)
        return res.body.id
      })

  // Confirm that the new org exists.
  // This requires a different scope.

  token = await shared.getAccessToken(['dockhealth/user.all.read'])
  headers = shared.userHeaders(token, userId)

  await request
    .get('/organization/' + newOrgId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Confirmed new organization exists:')
      console.debug(res.body)
      expect(res.body.id).toEqual(newOrgId)
    })

  // Update the new organization with a different name.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userHeaders(token, userId)

  let newName = ''
  await request
    .patch('/organization/' + organizationIdentifier1)
    .send({ name: name })
    .set(shared.userHeaders(token))
    .expect(200)
    .then(res => {
      console.debug('Updated organization 1:')
      console.debug(res.body)
      expect(res.body.name).toEqual(name)
    })

  // Confirm your changes to org1.
  token = await shared.getAccessToken(['dockhealth/user.all.read'])
  await request
    .get('/organization/' + organizationIdentifier1)
    .set(shared.userHeaders(token))
    .expect(200)
    .then(res => {
      console.debug('Confirmed changes to organization 1:')
      console.debug(res.body)
      expect(res.body.name).toEqual(name)
    })

})


