'use strict'

const shared = require('./../../shared')
const axios = require('axios')
const { describe, expect, it, beforeAll } = require('@jest/globals')
const api = axios.create({
  baseURL: shared.apiUrl
})

function getRandomNumber() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

describe('Field Lifecycle', () => {
  console.log('Running field lifecycle tests')
  console.log('Environment:', process.env.NODE_ENV)

  // Ensure all env vars are set.
  shared.checkEnv()

  const apiBaseUrl = shared.apiUrl + '/api/v1'
  const fieldApiBaseUrl = apiBaseUrl + '/configuration/field'

  const userId = shared.userIdentifier
  const orgId = shared.organizationIdentifier

  let token = null
  let patientId = null
  let fieldId = null
  let fieldOptionId1 = null
  let fieldOptionId2 = null

  beforeAll(async () => {
    // Obtain an access token with all necessary scopes.
    token = await shared.getAccessToken(['dockhealth/user.all.read', 'dockhealth/user.all.write', 'dockhealth/patient.all.read', 'dockhealth/patient.all.write'])
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

  describe('Field Operations', () => {

    it('should create a field', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createFieldUrl = fieldApiBaseUrl

      const targetType = 'PATIENT'
      const fieldCategoryType = 'PATIENT_PERSONAL'
      const fieldType = 'MULTI_SELECT'
      const name = 'New Multi Select Custom Field #1'
      const placeholder = 'Placeholder'
      const required = false
      const sortIndex = 1
      const options = [{
        name: 'New Option #9A', description: 'New Option #9A'
      }, {
        name: 'New Option #9B', description: 'New Option #9B'
      }]
      const displayOptions = ['PATIENT_HEADER', 'PATIENT_SEARCH']

      const field = {
        targetType, fieldCategoryType, fieldType, name, placeholder, required, sortIndex, options, displayOptions
      }

      const res = await api.post(createFieldUrl, field, headerJson)
      console.log(`Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.name).toEqual(field.name)

      fieldId = res.data.id

      fieldOptionId1 = res.data.options[0].id
      fieldOptionId2 = res.data.options[1].id
    })

    it('should create a patient', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createPatientUrl = apiBaseUrl + '/patient'

      const firstName = 'John' + getRandomNumber();
      const lastName = 'Doe' + getRandomNumber();
      const mrn = getRandomNumber() + getRandomNumber();

      const res = await api.post(createPatientUrl, {
        firstName: firstName,
        lastName: lastName,
        dob: '1980-01-01',
        mrn: mrn,
        patientMetaData: [{
          customFieldIdentifier: fieldId, values: [fieldOptionId1, fieldOptionId2]
        }]
      }, headerJson)
      console.log(`Created patient: ${JSON.stringify(res.data, null, 2)}`)
      expect(res.status).toEqual(200)
      expect(res.data.firstName).toEqual(firstName)
      expect(res.data.lastName).toEqual(lastName)
      expect(res.data.dob).toEqual('1980-01-01')
      expect(res.data.mrn).toEqual(mrn)

      patientId = res.data.id
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

    it('should delete the field', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const res = await api.delete(deleteFieldUrl, headerJson)
      console.log(`Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
    })
  })
})