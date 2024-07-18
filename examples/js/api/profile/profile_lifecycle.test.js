'use strict'

const shared = require('../../shared')
const axios = require('axios')
const { describe, expect, it, beforeAll } = require('@jest/globals')
const { nanoid } = require('nanoid')
const api = axios.create({
  baseURL: shared.apiUrl// , timeout: 10000
})

describe('Profile Lifecycle', () => {
  console.log('Running Profile lifecycle tests')
  console.log('Environment:', process.env.NODE_ENV)

  // Ensure all env vars are set.
  shared.checkEnv()

  const apiBaseUrl = shared.apiUrl + '/api/v1'

  const userId = shared.userIdentifier
  const orgId = shared.organizationIdentifier

  let token = null

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

  describe('Create a Profile Type, then create multiple profile, finally delete them all', () => {
    let customFieldId = null
    let profileTypeId = null
    const profileIds = []

    it('should create a new profile type', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createProfileTypeUrl = apiBaseUrl + '/profile/type'

      const res = await api.post(createProfileTypeUrl, {
        name: 'ProfileType lifecycle test ' + nanoid(4),
        description: 'ProfileType lifecycle test description ' + nanoid(4)
      }, headerJson)
      console.log(`Created profile type: ${JSON.stringify(res.data, null, 2)}`)
      expect(res.status).toEqual(200)

      profileTypeId = res.data.id
    })

    it('should create a new customField', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createCustomFieldUrl = apiBaseUrl + '/configuration/field'

      const res = await api.post(createCustomFieldUrl, {
        targetType: 'PROFILE',
        fieldCategoryType: 'TASK_CORE',
        fieldType: 'TEXT',
        name: 'text field for profile',
        relatedProfileType: { id: profileTypeId }
      }, headerJson)
      console.log(`Created custom field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.targetType).toEqual('PROFILE')
      expect(res.data.fieldCategoryType).toEqual('TASK_CORE')
      expect(res.data.fieldType).toEqual('TEXT')
      expect(res.data.name).toEqual('text field for profile')

      customFieldId = res.data.id
    })

    it('should create multiple profiles', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createProfileUrl = apiBaseUrl + '/profile'

      for (let i = 0; i < 3; i++) {
        const res = await api.post(createProfileUrl, {
          profileTypeId: profileTypeId,
          fields: [{profileTypeField:{identifier: customFieldId}, values: [{value: 'my custom field text value' + nanoid(4)}]}]
        }, headerJson)
        console.log(`Created profile: ${JSON.stringify(res.data, null, 2)}`)
        expect(res.status).toEqual(200)
        profileIds.push(res.data.id)
      }
    })

    it('should delete the customField', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteCustomFieldUrl = apiBaseUrl + '/configuration/field/' + customFieldId

      const res = await api.delete(deleteCustomFieldUrl, headerJson)
      console.log(`Deleted custom field: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
    })

    it('should delete all profiles', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteProfileUrl = apiBaseUrl + '/profile'

      for (let i = 0; i < profileIds.length; i++) {
        const res = await api.delete(deleteProfileUrl + '/' + profileIds[i], headerJson)
        console.log(`Deleted profile: ${JSON.stringify(res.data, null, 2)}`)
        expect(res.status).toEqual(200)
      }
    })

    it('should delete profile type', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteProfileTypeUrl = apiBaseUrl + '/profile/type/' + profileTypeId

      const res = await api.delete(deleteProfileTypeUrl, headerJson)
      console.log(`Deleted profile type: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
    })
  })
})
