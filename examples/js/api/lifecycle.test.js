'use strict'

const shared = require('../shared')

const axios = require('axios')
const { describe, expect, it, beforeAll } = require('@jest/globals')
const api = axios.create({
  baseURL: shared.apiUrl, timeout: 10000
})

describe('Lifecycle', () => {
  console.log('Running api lifecycle tests')
  console.log('Environment:', process.env.NODE_ENV)

  // Ensure all env vars are set.
  shared.checkEnv()

  const apiBaseUrl = shared.apiUrl + '/api/v1'

  const userId = shared.userIdentifier
  const orgId = shared.organizationIdentifier

  let token = null

  beforeAll(async () => {
    // Obtain an access token with all necessary scopes.
    token = await shared.getAccessToken([
      'dockhealth/user.all.read',
      'dockhealth/user.all.write',
      'dockhealth/patient.all.write',
      'dockhealth/patient.all.read'
    ])
  })

  describe('Get user with its identifier', () => {
    it('should get user identifier', async () => {

      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const findUserUrl = apiBaseUrl + '/user/' + userId

      const res = await api.get(findUserUrl, headerJson)
      console.log(`User: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.id).toEqual(userId)
    })
  })

  describe('Get organization with its identifier', () => {
    it('should get organization identifier', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const findOrgUrl = apiBaseUrl + '/organization/current'

      const res = await api.get(findOrgUrl, headerJson)
      console.log(`Organization: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.id).toEqual(orgId)
    })
  })

  describe('Create a new patient, then get it, then edit it, then delete it', () => {
    let patientId = null

    it('should create a new patient', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createPatientUrl = apiBaseUrl + '/patient'

      const randomNumberString = Math.random().toString(36).substring(7)
      const firstName = `John ${randomNumberString}`
      const lastName = `Doe ${randomNumberString}`
      const dob = '2000-01-01'
      const mrn = randomNumberString

      const patient = {
        firstName: firstName,
        lastName: lastName,
        dob: dob,
        mrn: mrn
      }

      const res = await api.post(createPatientUrl, patient, headerJson)
      console.log(`Created patient: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.firstName).toEqual(firstName)
      expect(res.data.lastName).toEqual(lastName)
      expect(res.data.dob).toEqual(dob)
      expect(res.data.mrn).toEqual(mrn)
      patientId = res.data.id
    })

    it('should get the patient', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const findPatientUrl = apiBaseUrl + '/patient/' + patientId

      const res = await api.get(findPatientUrl, headerJson)
      console.log(`Fetched patient: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.id).toEqual(patientId)
    })

    it('should update the patient', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const editPatientUrl = apiBaseUrl + '/patient/' + patientId

      const randomNumberString = Math.random().toString(36).substring(7)
      const firstName = `John ${randomNumberString}`
      const lastName = `Doe ${randomNumberString}`
      const dob = '2001-01-01'
      const mrn = randomNumberString

      const patient = {
        firstName: firstName,
        lastName: lastName,
        dob: dob,
        mrn: mrn
      }

      const res = await api.patch(editPatientUrl, patient, headerJson)
      console.log(`Updated patient: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.firstName).toEqual(firstName)
      expect(res.data.lastName).toEqual(lastName)
      expect(res.data.dob).toEqual(dob)
      expect(res.data.mrn).toEqual(mrn)
    })

    it('should delete the patient', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deletePatientUrl = apiBaseUrl + '/patient/' + patientId

      const res = await api.delete(deletePatientUrl, headerJson)
      console.log(`Deleted patient: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
    })
  })
})
