'use strict'

const shared = require('../../shared.js')
const request = require('supertest')(shared.apiUrl)
const { expect, test, beforeAll, describe, beforeEach, afterEach } = require('@jest/globals')
const { nanoid } = require('nanoid')

describe('Deploy workflow', () => {
  let createdTaskWorkflowTemplateId = null
  let header
  const workflowName = `Test Workflow ${nanoid()}`
  const taskName = `Test Task ${nanoid()}`
  const workflowTemplateType = 'SMARTFLOW' // `WORKFLOW` or `SMARTFLOW`

  let deployedWorkflowId = null
  let taskId

  let taskListId
  let taskGroupId

  beforeAll(async () => {
    const userId = shared.userIdentifier
    const orgId = shared.organizationIdentifier
    const accessToken = await shared.getAccessToken(['dockhealth/user.all.write', 'dockhealth/user.all.read'])

    header = shared.userAndOrgHeaders(accessToken, userId, orgId)
  })

  beforeEach(() => {
    console.log('Starting a new test...')
  })

  afterEach(() => {
    console.log('Test completed.')
  })

  test('Should create a new taskList', async () => {
    const payload = {
      listName: `Test Task List ${nanoid()}`, listDescription: `Test Task List Description ${nanoid()}`
    }

    const response = await request
      .post('/api/v1/list')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.listName).toBe(payload.listName)
    taskListId = response.body.id
    console.log(`Created Task List with ID: ${taskListId}`)
  })

  test('Should taskGroup', async () => {
    const payload = {
      groupName: `Test Task Group ${nanoid()}`, taskList: { id: taskListId }
    }

    const response = await request
      .post('/api/v1/task/group')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.groupName).toBe(payload.groupName)
    taskGroupId = response.body.id
    console.log(`Created Task Group with ID: ${taskGroupId}`)
  })

  test('Should successfully create a workflow template', async () => {
    const payload = {
      name: workflowName, templateType: workflowTemplateType
    }

    const response = await request
      .post('/api/v1/taskWorkflowTemplate')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.name).toBe(workflowName)
    expect(response.body.templateType).toBe(workflowTemplateType)

    // Store the workflow id for later use
    createdTaskWorkflowTemplateId = response.body.id
    console.log(`Created Workflow with ID: ${createdTaskWorkflowTemplateId}`)
    console.log('Created Workflow with name: ' + workflowName)
  })

  test('Should successfully deploy a workflow template', async () => {

    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Task Workflow Template ID from creation step not found')
    }

    // TODO: Update tests to create task list and group as needed (make standalone).
    const payload = {
      taskList: { id: taskListId },
      taskGroup: { id: taskGroupId },
      taskWorkflowTemplate: { id: createdTaskWorkflowTemplateId }
    }

    const response = await request
      .post('/api/v1/taskWorkflow')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.taskList.id).toBe(taskListId)
    expect(response.body.taskGroup.id).toBe(taskGroupId)

    // eslint-disable-next-line no-unused-vars
    deployedWorkflowId = response.body.id
    console.log(`Deployed Workflow with ID: ${deployedWorkflowId}`)
  })

  test('Should successfully add a task under the workflow', async () => {
    if (!deployedWorkflowId) {
      throw new Error('Deployed Workflow ID from deployment step not found')
    }

    // TODO: Update tests to create task list and group as needed (make standalone).
    const payload = {
      description: taskName, taskList: { id: taskListId }, taskGroup: { id: deployedWorkflowId }
    }

    const response = await request
      .post('/api/v1/task')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.description).toBe(payload.description)

    taskId = response.body.id
    console.log(`Added Task with ID: ${response.body.id}`)
  })

  test('Should successfully mark the task as completed', async () => {
    if (!deployedWorkflowId) {
      throw new Error('Deployed Workflow ID from deployment step not found')
    }

    const payload = {
      status: 'COMPLETE' // 'COMPLETE' or 'INCOMPLETE'
    }

    const response = await request
      .patch(`/api/v1/task/${taskId}`)
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.status).toBe(payload.status)
    console.log(`Updated Task Status to: ${payload.status}`)
  })

  test('Should successfully delete the task', async () => {
    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Task Workflow Template ID from creation step not found')
    }

    await request
      .delete(`/api/v1/task/${taskId}`)
      .set(header)
      .expect(204)

    console.log(`Deleted Workflow with ID: ${taskId}`)
  })

  test('Should successfully delete the deployed workflow', async () => {

    if (!deployedWorkflowId) {
      throw new Error('Deployed Workflow ID from deployment step not found')
    }

    await request
      .delete(`/api/v1/taskWorkflow/${deployedWorkflowId}`)
      .set(header)
      .expect(204)

    console.log(`Deleted Workflow with ID: ${deployedWorkflowId}`)
  })

  test('Should successfully delete a workflow template', async () => {
    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Task Workflow Template ID from creation step not found')
    }

    await request
      .delete(`/api/v1/taskWorkflowTemplate/${createdTaskWorkflowTemplateId}`)
      .set(header)
      .expect(200)

    console.log(`Deleted Workflow with ID: ${createdTaskWorkflowTemplateId}`)
  })
})
