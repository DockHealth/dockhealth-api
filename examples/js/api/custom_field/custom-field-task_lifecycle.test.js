'use strict'

const shared = require('./../../shared')
const axios = require('axios')
const { describe, expect, it, beforeAll } = require('@jest/globals')
const api = axios.create({
  baseURL: shared.apiUrl// , timeout: 10000
})

const fieldTypes = [{ fieldType: 'TEXT', name: 'Short Text Field' }, {
  fieldType: 'LONG_TEXT', name: 'Rich Text Field'
}, { fieldType: 'NUMBER', name: 'Number' }, { fieldType: 'DATE', name: 'Calendar Date' }, {
  fieldType: 'HYPERLINK', name: 'Link'
}, { fieldType: 'BOOLEAN', name: 'Yes/No' }]

describe('Task Lifecycle', () => {
  console.log('Running task lifecycle tests')
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

  describe('Create a taskList, then create task group, then create task, then get task, finally delete them all', () => {
    let taskListId = null
    let taskGroupId = null
    let taskId = null
    const customFieldIdList = []

    it('should create a new taskList', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createTaskListUrl = apiBaseUrl + '/list'

      const res = await api.post(createTaskListUrl, {
        listName: 'TaskList lifecycle test', listDescription: 'TaskList lifecycle test description'
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
        taskList: { id: taskListId }, groupName: 'TaskGroup lifecycle test2'
      }, headerJson)
      console.log(`Created task group: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.groupName).toEqual('TaskGroup lifecycle test2')

      taskGroupId = res.data.id
    })

    for (const field of fieldTypes) {
      let customFieldId = null

      it(`should create a new ${field.name}`, async () => {
        const headerJson = {
          headers: shared.userAndOrgHeaders(token, userId, orgId)
        }
        const createCustomFieldUrl = apiBaseUrl + '/configuration/field'

        const res = await api.post(createCustomFieldUrl, {
          targetType: 'TASK', fieldCategoryType: 'TASK_CORE', fieldType: field.fieldType, name: field.name
        }, headerJson)
        console.log(`Created ${field.name}: ${JSON.stringify(res.data, null, 2)}`)

        expect(res.status).toEqual(200)
        expect(res.data.targetType).toEqual('TASK')
        expect(res.data.fieldCategoryType).toEqual('TASK_CORE')
        expect(res.data.fieldType).toEqual(field.fieldType)
        expect(res.data.name).toEqual(field.name)

        customFieldId = res.data.id
        customFieldIdList.push(customFieldId)
      })
    }

    it('should create a new task', async () => {
      const headerJson = {
        headers: shared.userAndOrgHeaders(token, userId, orgId)
      }
      const createTaskUrl = apiBaseUrl + '/task'

      const res = await api.post(createTaskUrl, {
        taskList: { id: taskListId },
        taskGroup: { id: taskGroupId },
        description: 'Task lifecycle test description',
        taskMetaData: [{
          customFieldIdentifier: customFieldIdList[0], value: 'my custom field text value'
        }, {
          customFieldIdentifier: customFieldIdList[1], value: 'my custom field rich text value'
        }, {
          customFieldIdentifier: customFieldIdList[2], value: 123
        }, {
          customFieldIdentifier: customFieldIdList[3], value: '2024-05-22T07:00:00.000Z'
        }, {
          customFieldIdentifier: customFieldIdList[4], value: 'https://www.dock.health'
        }, {
          customFieldIdentifier: customFieldIdList[5], value: true
        }]
      }, headerJson)
      console.log(`Created task: ${JSON.stringify(res.data, null, 2)}`)

      expect(res.status).toEqual(200)
      expect(res.data.taskList.id).toEqual(taskListId)
      expect(res.data.description).toEqual('Task lifecycle test description')

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
      for (const customFieldId of customFieldIdList) {
        const headerJson = {
          headers: shared.userAndOrgHeaders(token, userId, orgId)
        }
        const deleteCustomFieldUrl = apiBaseUrl + '/configuration/field/' + customFieldId

        const res = await api.delete(deleteCustomFieldUrl, headerJson)
        console.log(`Deleted custom field: ${JSON.stringify(res.data, null, 2)}`)

        expect(res.status).toEqual(200)
      }
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
  })
})
