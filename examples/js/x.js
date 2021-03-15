// Now, create a token appropriate for creating your first organization.
// The `user` scope here means that we're performing the operation on behalf of the specified user.

let userWriteToken = await shared.getAccessToken(['dockhealth/user.all.write'])

// `/organization` endpoints require the `Authorization` and `x-api-key` headers as well as an
// `x-user-id` header set to the user identifier of the Dock Health user making the request.

// In this case, let's set that header to the user identifier of the organization owner that we retrieved above.

let userWriteHeaders = shared.userHeaders(userWriteToken, ownerUserIdentifier)

// Create our first new organization and store the returned organization identifier for use later.
// You must supply an domain name for the new organization, and that domain name must be unique across all of Dock Health.
// To make it easier to guarantee a unique domain name, we will generate one here.
// In real life, you should use your organization's domain name, which will be unique.
let domain = shared.generateDomain()
const organizationIdentifier1 =
  await request
    .post('/organization')
    .send({ domain: domain, name: 'org-name-' + domain })
    .set(userWriteHeaders)
    .expect(200)
    .then(res => {
      console.debug('Created organization 1:')
      console.debug(res.body)
      expect(res.body.domain).toEqual(domain)
      return res.body.id
    })

// Confirm that org1 exists.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/organization/' + organizationIdentifier1)
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Confirmed organization 1 exists:')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier1)
  })

// Update org1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
name = 'org1-updated'
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

// Create a second new org, org2, using our account owner.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
domain = shared.generateDomain()
const organizationIdentifier2 =
  await request
    .post('/organization')
    .send({ domain: domain, name: 'name-' + domain })
    .set(shared.userHeaders(token))
    .expect(200)
    .then(res => {
      console.debug('Created organization 2:')
      console.debug(res.body)
      expect(res.body.domain).toEqual(domain)
      return res.body.id
    })

// Create a new user, user1, under org1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
let email = shared.generateEmail()
const userIdentifier1 =
  await request
    .post('/user')
    .send({ email: email, firstName: 'First', lastName: email })
    .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
    .expect(200)
    .then(res => {
      console.debug('Created user 1 under organization 1:')
      console.debug(res.body)
      expect(res.body.email).toEqual(email)
      return res.body.id
    })

// Confirm that user1 belongs to org1.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed user 1 belongs to organization 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier1)
  })

// Update user1 -- must be either an admin or the user themselves.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
let lastName = 'LastNameUpdated'
await request
  .patch('/user/' + userIdentifier1)
  .send({ lastName: lastName })
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Updated user 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
  })

// Confirm your changes to user1.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed changes to user 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
  })

// Add user1 to org2.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .patch('/organization/' + organizationIdentifier2 + '/user/' + userIdentifier1)
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Added user 1 to organization 2:')
    console.debug(res.body)
  })

// Confirm that user1 belongs to org2.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier2))
  .expect(200)
  .then(res => {
    console.debug('Confirmed user 1 belongs to organization 2:')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier1)
  })

// Create a new patient, patient1, using user1 under org1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
let mrn = shared.generateMrn()
const patientIdentifier1 =
  await request
    .post('/patient')
    .send({ mrn: mrn, firstName: 'First', lastName: mrn, dob: '1970-01-01' })
    .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
    .expect(200)
    .then(res => {
      console.debug('Created patient 1 using user 1 under organization 1:')
      console.debug(res.body)
      expect(res.body.mrn).toEqual(mrn)
      return res.body.id
    })

// Confirm that patient1 belongs to org1.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/' + patientIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed patient 1 belongs to organization 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(patientIdentifier1)
  })

// Update patient1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
lastName = 'LastNameUpdated'
await request
  .patch('/patient/' + patientIdentifier1)
  .send({ lastName: lastName })
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Updated patient 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
  })

// Confirm your changes to patient1.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/' + patientIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed changes to patient 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
  })

// Create a new patient note, patientNote1, for patient1, using user 1 under org1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
let description = 'Patient1, Note1'
const patientNoteIdentifier1 =
  await request
    .post('/patient/note')
    .send({ patient: { id: patientIdentifier1 }, description: 'Patient1, Note1' })
    .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
    .expect(200)
    .then(res => {
      console.debug('Created patient note 1 for patient 1 using user 1 under organization 1:')
      console.debug(res.body)
      expect(res.body.description).toEqual(description)
      return res.body.id
    })

// Confirm that patientNote1 belongs to patient1.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/note/' + patientNoteIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed patient note 1 belongs to patient 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(patientNoteIdentifier1)
  })

// Update patientNote1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
description = 'Patient1, Note1, Update1'
await request
  .patch('/patient/note/' + patientNoteIdentifier1)
  .send({ description: description })
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Updated patient note 1:')
    console.debug(res.body)
    expect(res.body.description).toEqual(description)
  })

// Confirm your changes to patientNote1.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/note/' + patientNoteIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed changes to patient note 1:')
    console.debug(res.body)
    expect(res.body.description).toEqual(description)
  })

// Delete patientNote1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
await request
  .delete('/patient/note/' + patientNoteIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Deleted patient note 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(patientNoteIdentifier1)
  })

// Confirm that patientNote1 is no longer active.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/note/' + patientNoteIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed patient note 1 is no longer active.')
    console.debug(res.body)
    expect(res.body.active).toEqual(false)
  })

// Delete patient1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
await request
  .delete('/patient/' + patientIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Deleted patient 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(patientIdentifier1)
  })

// Confirm that patient1 is no longer active.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/' + patientIdentifier1)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed patient 1 is no longer active:')
    console.debug(res.body)
    expect(res.body.active).toEqual(false)
  })

// Re-create patient1, using user1 under org1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
const patientIdentifier11 =
  await request
    .post('/patient')
    .send({ mrn: mrn, firstName: 'First', lastName: mrn, dob: '1970-01-01' })
    .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
    .expect(200)
    .then(res => {
      console.debug('Re-created patient 1 using user 1 under organization 1:')
      console.debug(res.body)
      expect(res.body.mrn).toEqual(mrn)
      return res.body.id
    })

// Confirm that patient1 again belongs to org1.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/' + patientIdentifier11)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed patient 1 again belongs to organization 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(patientIdentifier11)
  })

// Update re-created patient1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
lastName = 'LastNameUpdated'
lastName = await request
  .patch('/patient/' + patientIdentifier11)
  .send({ lastName: lastName })
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Updated re-created patient 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
    return res.body.lastName
  })

// Confirm your changes to re-created patient1.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/' + patientIdentifier11)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed changes to re-created patient 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
  })

// Delete re-created patient1.
token = await shared.getAccessToken(['dockhealth/patient.all.write'])
await request
  .delete('/patient/' + patientIdentifier11)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Deleted re-created patient 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(patientIdentifier11)
  })

// Confirm that re-created patient1 is again no longer active.
token = await shared.getAccessToken(['dockhealth/patient.all.read'])
await request
  .get('/patient/' + patientIdentifier11)
  .set(shared.createAllHeaders(token, userIdentifier1, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed re-created patient 1 is again no longer active:')
    console.debug(res.body)
    expect(res.body.active).toEqual(false)
  })

// Remove user1 from org2.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/organization/' + organizationIdentifier2 + '/user/' + userIdentifier1)
  .set(shared.createUserHeaders(token, shared.userIdentifier))
  .expect(200)
  .then(res => {
    console.debug('Removed user 1 from organization 2:')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier2)
  })

// Confirm that user1 no longer belongs to org2.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier1)
  .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier2))
  .expect(200)
  .then(res => {
    console.debug('Confirmed user 1 no longer belongs to organization 2.')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier1)
    expect(res.body.active).toEqual(false)
  })

// Remove user1 from org1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/organization/' + organizationIdentifier1 + '/user/' + userIdentifier1)
  .set(shared.createUserHeaders(token, shared.userIdentifier))
  .expect(200)
  .then(res => {
    console.debug('Removed user 1 from organization 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier1)
  })

// Confirm that user1 no longer belongs to org1.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier1)
  .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed user 1 no longer belongs to organization 1.')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier1)
    expect(res.body.active).toEqual(false)
  })

// Delete user1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/user/' + userIdentifier1)
  .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Deleted user 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier1)
  })

// Confirm that user1 is no longer active.
// NOTE: This must be done as an active user in one of the orgs previously associated with the deleted user!
token = await shared.getAccessToken(['dockhealth/user.all.read'])
email =
  await request
    .get('/user/' + userIdentifier1)
    .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
    .expect(200)
    .then(res => {
      console.debug('Confirmed user 1 is no longer active:')
      console.debug(res.body)
      expect(res.body.active).toEqual(false)
      return res.body.email
    })

// Re-create user1 under org1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
const userIdentifier11 =
  await request
    .post('/user')
    .send({ email: email, firstName: 'First', lastName: email })
    .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
    .expect(200)
    .then(res => {
      console.debug('Re-created user 1 under organization 1:')
      console.debug(res.body)
      expect(res.body.email).toEqual(email)
      return res.body.id
    })

// Confirm that user1 again belongs to org1.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier11)
  .set(shared.createAllHeaders(token, userIdentifier11, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed user 1 again belongs to organization 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier11)
  })

// Update re-created user1 -- must be either an admin or the user themselves.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
lastName = 'LastNameUpdatedAgain'
lastName = await request
  .patch('/user/' + userIdentifier11)
  .send({ lastName: lastName })
  .set(shared.createAllHeaders(token, userIdentifier11, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Updated re-created user 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
    return res.body.lastName
  })

// Confirm your changes to re-created user1.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier11)
  .set(shared.createAllHeaders(token, userIdentifier11, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed changes to re-created user 1:')
    console.debug(res.body)
    expect(res.body.lastName).toEqual(lastName)
  })

// Remove re-created user1 from org1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/organization/' + organizationIdentifier1 + '/user/' + userIdentifier11)
  .set(shared.createUserHeaders(token, shared.userIdentifier))
  .expect(200)
  .then(res => {
    console.debug('Removed re-created user 1 from organization 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier1)
  })

// Confirm that user1 again no longer belongs to org1.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier11)
  .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed user 1 again no longer belongs to organization 1.')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier11)
    expect(res.body.active).toEqual(false)
  })

// Delete re-created user1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/user/' + userIdentifier11)
  .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Deleted re-created user 1:')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier11)
  })

// Confirm that user1 is again no longer active.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/user/' + userIdentifier11)
  .set(shared.createAllHeaders(token, shared.userIdentifier, organizationIdentifier1))
  .expect(200)
  .then(res => {
    console.debug('Confirmed user 1 is again no longer active.')
    console.debug(res.body)
    expect(res.body.id).toEqual(userIdentifier11)
    expect(res.body.active).toEqual(false)
  })

// Delete org 2.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/organization/' + organizationIdentifier2)
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Deleted organization 2:')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier2)
  })

// Confirm that org2 is no longer active.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
domain = await request
  .get('/organization/' + organizationIdentifier2)
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Confirmed organization 2 is no longer active:')
    console.debug(res.body)
    expect(res.body.active).toEqual(false)
    return res.body.domain
  })

// Re-create org2.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
const organizationIdentifier21 =
  await request
    .post('/organization')
    .send({ domain: domain, name: 'recreated-' + domain })
    .set(shared.createUserHeaders(token, shared.userIdentifier))
    .expect(200)
    .then(res => {
      console.debug('Re-created organization 2:')
      console.debug(res.body)
      expect(res.body.domain).toEqual(domain)
      return res.body.id
    })

// Confirm that org2 is again active.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/organization/' + organizationIdentifier21)
  .set(shared.createUserHeaders(token, shared.userIdentifier))
  .expect(200)
  .then(res => {
    console.debug('Confirmed organization 2 is again active:')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier21)
  })

// Update re-created org2.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
name = 'org2-updated-again'
name = await request
  .patch('/organization/' + organizationIdentifier21)
  .send({ name: name })
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Updated re-created organization 2:')
    console.debug(res.body)
    expect(res.body.name).toEqual(name)
    return res.body.name
  })

// Confirm your changes to re-created org2.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/organization/' + organizationIdentifier21)
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Confirmed changes to re-created organization 2:')
    console.debug(res.body)
    expect(res.body.name).toEqual(name)
  })

// Delete re-created org2.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/organization/' + organizationIdentifier21)
  .set(shared.createUserHeaders(token, shared.userIdentifier))
  .expect(200)
  .then(res => {
    console.debug('Deleted re-created organization 2:')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier21)
  })

// Confirm that re-created org2 again is no longer active.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
await request
  .get('/organization/' + organizationIdentifier21)
  .set(shared.createUserHeaders(token, shared.userIdentifier))
  .expect(200)
  .then(res => {
    console.debug('Confirmed re-created organization 2 is again no longer active.')
    console.debug(res.body)
    expect(res.body.id).toEqual(organizationIdentifier21)
    expect(res.body.active).toEqual(false)
  })

// Delete org 1.
token = await shared.getAccessToken(['dockhealth/user.all.write'])
await request
  .delete('/organization/' + organizationIdentifier1)
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Deleted organization 1:')
    console.debug(res.body)
  })

// Confirm that org1 is no longer active.
token = await shared.getAccessToken(['dockhealth/user.all.read'])
return request
  .get('/organization/' + organizationIdentifier1)
  .set(shared.userHeaders(token))
  .expect(200)
  .then(res => {
    console.debug('Confirmed organization 1 is no longer active.')
    console.debug(res.body)
    expect(res.body.active).toEqual(false)
  })
})
