'use strict'

const shared = require('../../shared')
const axios = require('axios')
const { describe, expect, it, beforeAll } = require('@jest/globals')
const { nanoid } = require('nanoid')
const api = axios.create({
  baseURL: shared.apiUrl// , timeout: 10000
})

describe('Profile with Task Lifecycle', () => {
  console.log('Running Profile with Task lifecycle tests')
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
    let taskListId = null
    let taskGroupId = null
    let customFieldId = null
    let profileTypeId = null
    let profileId = null
    let taskId = null

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

    it('should create a new profile', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createProfileUrl = apiBaseUrl + '/profile'

      const res = await api.post(createProfileUrl, {
        profileTypeId: profileTypeId,
        fields: [{
          profileTypeField: { identifier: customFieldId },
          values: [{ value: 'my custom field text value' + nanoid(4) }]
        }]
      }, headerJson)
      console.log(`Created profile: ${JSON.stringify(res.data, null, 2)}`)
      expect(res.status).toEqual(200)
      // profileIds.push(res.data.id)
      profileId = res.data.id
    })

    it('should create a new taskList', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createTaskListUrl = apiBaseUrl + '/list'

      const res = await api.post(createTaskListUrl, {
        listName: 'TaskList lifecycle test',
        listDescription: 'TaskList lifecycle test description'
      }, headerJson)
      console.log(`Created task list: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.listName).toEqual('TaskList lifecycle test')
      expect(res.data.listDescription).toEqual('TaskList lifecycle test description')

      taskListId = res.data.id
    })

    it('should create a new taskGroup', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createTaskGroupUrl = apiBaseUrl + '/task/group'

      const res = await api.post(createTaskGroupUrl, {
        taskList: { id: taskListId },
        groupName: 'TaskGroup lifecycle test2'
      }, headerJson)
      console.log(`Created task group: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.groupName).toEqual('TaskGroup lifecycle test2')

      taskGroupId = res.data.id
    })

    it('should create a new task', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createTaskUrl = apiBaseUrl + '/task'

      const res = await api.post(createTaskUrl, {
        taskList: { id: taskListId },
        taskGroup: { id: taskGroupId },
        description: 'Profile lifecycle test description',
        profileIdentifier: profileId
      }, headerJson)
      console.log(`Created task: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.taskList.id).toEqual(taskListId)
      expect(res.data.description).toEqual('Profile lifecycle test description')

      taskId = res.data.id
    })

    it('should delete the task', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteTaskUrl = apiBaseUrl + '/task/' + taskId

      const res = await api.delete(deleteTaskUrl, headerJson)
      console.log(`Deleted task: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(204)
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

    it('should delete the taskGroup', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteTaskGroupUrl = apiBaseUrl + '/task/group/' + taskGroupId

      const res = await api.delete(deleteTaskGroupUrl, headerJson)
      console.log(`Deleted task group: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
    })

    it('should delete the taskList', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteTaskListUrl = apiBaseUrl + '/list/' + taskListId

      const res = await api.delete(deleteTaskListUrl, headerJson)
      console.log(`Deleted task list: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
    })

    it('should delete profile', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const deleteProfileUrl = apiBaseUrl + '/profile/' + profileId

      const res = await api.delete(deleteProfileUrl, headerJson)
      console.log(`Deleted profile: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
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
