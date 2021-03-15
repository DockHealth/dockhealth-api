'use strict'

/* Needed for standard.js to not complain about Jest global namespace functions. */
/* eslint-env jest */

const shared = require('./shared')
const request = require('supertest')(shared.apiUrl)

test('Dock Health API Lifecycle Test.', async () => {

  // This test demonstrates the full Dock Health onboarding lifecycle.

  console.debug('Running Dock Health API Lifecycle Test.')
  console.debug('Environment: ' + process.env.NODE_ENV)

  // Make sure all our env vars are set.
  shared.checkEnv()

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

  // Store the organization id of that organization for use in our next request, below....
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
        const organization = res.body.find(org => org.domain === shared.domain)
        if (!organization) {
          throw Error("Organization not found: " + shared.domain)
        }
        console.debug("Located organization: " + organization.domain)
        return organization.id
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
      const user = res.body.find(u => u.email === shared.email)
      if (!user) {
        throw Error("User not found: " + shared.email)
      }
      console.debug("Located user: " + user.email)
      return user.id
    })

  // Using this user, create a new organization to be associated with your developer account.
  // This user will be the owner of this new organization.

  // This requires a different scope.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])

  // `/organization` endpoints an additional `x-user-id` header set to the id of the user making the request.
  // See the `shared.userHeaders()` convenience method for an example of setting the appropriate headers.

  headers = shared.userHeaders(token, userId)

  // You must supply an domain name for the new organization, and that domain name must be unique across all of Dock Health.
  // To make it easier to guarantee a unique domain name, we will generate one here based on your domain.
  // In real life, you must supply a unique domain name.

  let domain = shared.generateDomain()

  // Create a new organization and store the returned id for later use.

  const newOrgId =
    await request
      .post('/api/v1/organization')
      .send({ domain: domain, name: 'new-org-' + domain })
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Created new organization: ' + domain)
        console.debug(res.body)
        expect(res.body.domain).toEqual(domain)
        return res.body.id
      })

  // Update the new organization with a different name.
  // This requires a different scope.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userHeaders(token, userId)

  let newName = 'new-org-updated'
  await request
    .patch('/api/v1/organization/' + newOrgId)
    .send({ name: newName })
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Updated new organization: ' + newOrgId)
      console.debug(res.body)
      expect(res.body.name).toEqual(newName)
    })

  // Confirm your changes to the organization.

  token = await shared.getAccessToken(['dockhealth/user.all.read'])
  headers = shared.userHeaders(token, userId)

  await request
    .get('/api/v1/organization/' + newOrgId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Confirmed changes to organization: ' + newOrgId)
      console.debug(res.body)
      expect(res.body.name).toEqual(newName)
    })

  // Create a new user and store the returned id for later use.

  // `/user` endpoints an additional `x-organization-id` header set to the id of the organization making the request.
  // See the `shared.userAndOrgHeaders()` convenience method for an example of setting the appropriate headers.

  // This user will be associated with the organization specified by `x-organization-id` header in the request.
  // Here, we will associate the new user with the organization you created when setting up your account,
  // but we will show you how to associate users with other organizations in the next step.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userAndOrgHeaders(token, userId, orgId)

  let newUserEmail = shared.generateEmail()
  const newUserId =
    await request
      .post('/api/v1/user')
      .send({ email: newUserEmail, firstName: 'First', lastName: 'Last' })
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Created new user: ' + newUserEmail)
        console.debug(res.body)
        expect(res.body.email).toEqual(newUserEmail)
        return res.body.id
      })

  // Add the new user to the new organization you created above.
  // The PATCH response will return the modified organization,
  // but the organization will not include all the users,
  // since it could be a big list.

  // NOTE: In order to add a user to an organization, the user making the request must be an admin or owner of that org.
  // Here, we will use the user who created the organization, who is it's owner by default.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userHeaders(token, userId)

  await request
    .patch('/api/v1/organization/' + newOrgId + '/user/' + newUserId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Added new user to new organization:')
      console.debug(res.body)
    })

  // Confirm that the new user is now a member of both organizations.
  // There is currently no way to do this in a single query.
  // Instead, we issue two separate queries for the user by its id,
  // specifying a different organization id in each request.

  // If the user is an active member of the organization, it will be returned,
  // and its `active` attribute will be true.

  // If the user is an inactive (soft-deleted) member of the organization,
  // it will be returned, and its `active` attribute will be false.

  // If the user is NOT a member of the organization, the request will return 404 Not Found.

  token = await shared.getAccessToken(['dockhealth/user.all.read'])
  headers = shared.userAndOrgHeaders(token, userId, orgId)

  await request
    .get('/api/v1/user/' + newUserId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Confirmed new user belongs to (original) organization: ' + orgId)
      console.debug(res.body)
      expect(res.body.id).toEqual(newUserId)
    })

  headers = shared.userAndOrgHeaders(token, userId, newOrgId)

  await request
    .get('/api/v1/user/' + newUserId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Confirmed new user belongs to (new) organization: ' + newOrgId)
      console.debug(res.body)
      expect(res.body.id).toEqual(newUserId)
    })

  // Create a new patient and store the returned id for later use.
  // Use our new user and organization.

  // This requires a new scope.

  token = await shared.getAccessToken(['dockhealth/patient.all.write'])
  headers = shared.userAndOrgHeaders(token, newUserId, newOrgId)

  let newPatientMrn = shared.generateMrn()
  const newPatientId =
    await request
      .post('/api/v1/patient')
      .send({ mrn: newPatientMrn, firstName: 'First', lastName: 'Last', dob: '1970-01-01' })
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Created new patient: ' + newPatientMrn)
        console.debug(res.body)
        expect(res.body.mrn).toEqual(newPatientMrn)
        return res.body.id
      })

  // Confirm that the new patient exists.

  token = await shared.getAccessToken(['dockhealth/patient.all.read'])
  headers = shared.userAndOrgHeaders(token, newUserId, newOrgId)

  await request
    .get('/api/v1/patient/' + newPatientId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Confirmed new patient exists: ' + newPatientMrn)
      console.debug(res.body)
      expect(res.body.id).toEqual(newPatientId)
      expect(res.body.mrn).toEqual(newPatientMrn)
    })

  // Create a note for the new patient.

  token = await shared.getAccessToken(['dockhealth/patient.all.write'])
  headers = shared.userAndOrgHeaders(token, newUserId, newOrgId)

  let newPatientNote = 'This is a new note for patient: ' + newPatientMrn
  const newPatientNoteId =
    await request
      .post('/api/v1/patient/note')
      .send({ patient: { id: newPatientId }, description: newPatientNote })
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Created note for new patient:')
        console.debug(res.body)
        expect(res.body.description).toEqual(newPatientNote)
        return res.body.id
      })

  // List all the notes for our new patient.
  // Confirm that our new note is in the list.

  token = await shared.getAccessToken(['dockhealth/patient.all.read'])
  headers = shared.userAndOrgHeaders(token, newUserId, newOrgId)

  await request
    .get('/api/v1/patient/note?patient=' + newPatientId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Notes for new patient: ' + newPatientId)
      console.debug(res.body)
      const note = res.body.find(n => n.id === newPatientNoteId)
      if (!note) {
        throw Error("Patient note not found.")
      }
      console.debug("Located patient note: " + note.description)
    })

  // Now, delete everything we just created.
  // IMPORTANT: Currently, Dock Health ONLY supports soft-deletions! Any deleted item is actually still retrievable via
  // the API, but its `active` attribute will be set to `false`.

  // To fetch only non-deleted (`active`) items from the API, use the `search` endpoints, supplying `active=true` as one
  // of the search parameters. Alternatively, retrieve items from the API and filter any inactive items from the
  // returned results.

  // Delete the new patient note.

  token = await shared.getAccessToken(['dockhealth/patient.all.write'])
  headers = shared.userAndOrgHeaders(token, newUserId, newOrgId)

  await request
    .delete('/api/v1/patient/note/' + newPatientNoteId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Deleted new patient note:')
      console.debug(res.body)
      expect(res.body.id).toEqual(newPatientNoteId)
      expect(res.body.active).toEqual(false)
    })

  // Delete the new patient.

  token = await shared.getAccessToken(['dockhealth/patient.all.write'])
  headers = shared.userAndOrgHeaders(token, newUserId, newOrgId)

  await request
    .delete('/api/v1/patient/' + newPatientId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Deleted new patient:')
      console.debug(res.body)
      expect(res.body.id).toEqual(newPatientId)
      expect(res.body.active).toEqual(false)
    })

  // Remove the new user from the both organizations.
  // IMPORTANT: This is necessary before a user can be deleted.
  // IMPORTANT: Only an organization admin or owner can remove a user from an organization.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userHeaders(token, userId)

  await request
    .delete('/api/v1/organization/' + newOrgId + '/user/' + newUserId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Removed new user from (new) organization:')
      console.debug(res.body)
    })

  await request
    .delete('/api/v1/organization/' + orgId + '/user/' + newUserId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Removed new user from (original) organization:')
      console.debug(res.body)
    })

  // Delete the new user.
  // IMPORTANT: A user cannot be deleted if they are an active member of ANY organization.
  // IMPORTANT: A user cannot delete themselves, and only an organization admin or owner can delete a user.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userAndOrgHeaders(token, userId, orgId)

  await request
    .delete('/api/v1/user/' + newUserId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Deleted new user:')
      console.debug(res.body)
      expect(res.body.id).toEqual(newUserId)
      expect(res.body.active).toEqual(false)
    })

  // Delete the new organization.
  // IMPORTANT: An organization cannot be deleted if it contains ANY active members OTHER than its owner.
  // IMPORTANT: Only the organization owner can delete an organization.

  // First, empty the organization -- remove any active users from it.
  // To do that, fetch all the users in the org....

  token = await shared.getAccessToken(['dockhealth/user.all.read'])
  headers = shared.userAndOrgHeaders(token, userId, newOrgId)

  const users =
    await request
      .get('/api/v1/user')
      .set(headers)
      .expect(200)
      .then(res => {
        console.debug('Fetched users to remove from new organization:')
        console.debug(res.body)
        return res.body
      })

  // Remove the user from the new organization IF:
  // 1. They are active.
  // 2. They are not the organization owner.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userAndOrgHeaders(token, userId, newOrgId)

  const toRemove = users.map(
    async user => {
      if (user.active && !user.id === userId) {
        await request
          .delete('/api/v1/organization/' + newOrgId + '/user/' + user.id)
          .set(headers)
          .expect(200)
          .then(res => {
            console.debug('Removed user from (new) organization: ' + user.id)
            return user
          })
      } else {
        return null;
      }
    })

  await Promise.all(toRemove)

  // Finally, delete the new organization.
  // Again, this must be done by the organization owner.

  token = await shared.getAccessToken(['dockhealth/user.all.write'])
  headers = shared.userHeaders(token, userId)

  await request
    .delete('/api/v1/organization/' + newOrgId)
    .set(headers)
    .expect(200)
    .then(res => {
      console.debug('Deleted new organization:')
      console.debug(res.body)
      expect(res.body.id).toEqual(newOrgId)
    })

  // That's it!
  // Again, please see the API README for more information on the Dock Health API,
  // links to additional documentation, and links to support.
  // Thanks for using Dock Health!

  console.debug('Finished Dock Health API Lifecycle Test.')
})

