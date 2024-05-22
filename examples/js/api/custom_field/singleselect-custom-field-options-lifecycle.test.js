'use strict'

const shared = require('./../../shared')
const axios = require('axios')
const { describe, expect, it, beforeAll } = require('@jest/globals')
const api = axios.create({
  baseURL: shared.apiUrl// , timeout: 10000
})

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
  let fieldId = null
  let fieldOptionId1 = null
  let fieldOptionId2 = null
  let fieldOptionIdAdded1 = null
  let fieldOptionIdAdded3 = null
  let fieldOptionIdAdded4 = null
  let fieldOptionIdAdded5 = null

  beforeAll(async () => {
    // Obtain an access token with all necessary scopes.
    token = await shared.getAccessToken(['dockhealth/user.all.read', 'dockhealth/user.all.write'])
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
      const fieldType = 'PICK_LIST'
      const name = 'New Custom Field #1'
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
      // expect(res.data.type).toEqual(fieldType)
      // expect(res.data.required).toEqual(field.required)

      fieldId = res.data.id

      fieldOptionId1 = res.data.options[0].id
      fieldOptionId2 = res.data.options[1].id
    })

    it('should patch the field with optionsToAdd 1', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {
        optionsToAdd: [{
          name: 'Option 5555', description: 'Option 5555'
        }]
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      fieldOptionIdAdded1 = res.data.options[2].id
      expect(res.status).toEqual(200)
      expect(res.data.options).toHaveLength(3)
    })

    it('should patch the field with no inputs', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {}

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      // Ensure the options are unchanged
      expect(res.data.options).toHaveLength(3)
    })

    it('should patch field with depreciated options with 4 inputs', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const options = [{
        name: 'New Option #11A', description: 'New Option #11A'
      }, {
        name: 'New Option #11B', description: 'New Option #11B'
      }, {
        name: 'New Option #11C', description: 'New Option #11C'
      }, {
        name: 'New Option #11D', description: 'New Option #11D'
      }]

      const patchData = {
        options: options
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      // Ensure the options are unchanged
      expect(res.data.options).toHaveLength(4)
    })

    it('should patch the field with empty inputs to clear', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {
        options: []
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      // Ensure the options are cleared
      expect(res.data.options).toHaveLength(0)
    })

    it('should patch the field with optionsToAdd to empty option list', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {
        optionsToAdd: [{
          name: 'Option 5555', description: 'Option 5555'
        }]
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      fieldOptionIdAdded3 = res.data.options[0].id
      expect(res.status).toEqual(200)
      expect(res.data.options).toHaveLength(1)
    })

    it('should patch the field with optionsToDelete', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {
        optionsToDelete: [{
          id: fieldOptionIdAdded3
        }]
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.options).toHaveLength(0)
    })

    it('should patch the field with optionsToAdd ', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {
        optionsToAdd: [{
          name: 'Option 6666', description: 'Option 6666'
        }]
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.options).toHaveLength(1)
      fieldOptionIdAdded4 = res.data.options[0].id
    })

    it('should patch the field with both optionsToAdd and optionsToDelete', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {
        optionsToAdd: [{
          name: 'Option 7777', description: 'Option 7777'
        }], optionsToDelete: [{
          id: fieldOptionIdAdded4
        }]
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.options).toHaveLength(1)
      fieldOptionIdAdded5 = res.data.options[0].id
    })

    it('should get the field', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const getFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const res = await api.get(getFieldUrl, headerJson)
      console.log(`Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.id).toEqual(fieldId)
    })

    it('should patch the field with optionsToDelete', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const patchFieldUrl = fieldApiBaseUrl + '/' + fieldId

      const patchData = {
        optionsToDelete: [{
          id: fieldOptionIdAdded5
        }]
      }

      const res = await api.patch(patchFieldUrl, patchData, headerJson)
      console.log(`Patched Field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.options).toHaveLength(0)
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