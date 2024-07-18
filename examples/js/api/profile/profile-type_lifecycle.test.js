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

  describe('Create a Profile Type, then get profile type, finally delete them all', () => {

    let profileTypeId = null

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

    it('should get profile type', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const findProfileTypeUrl = apiBaseUrl + '/profile/type/' + profileTypeId

      const res = await api.get(findProfileTypeUrl, headerJson)
      console.log(`Profile type: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.id).toEqual(profileTypeId)
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
