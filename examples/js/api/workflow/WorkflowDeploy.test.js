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

  test('Should successfully create a workflow template', async () => {
    const payload = {
      name: workflowName,
      templateType: workflowTemplateType
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

    const payload = {
      taskList: { id: shared.taskListIdentifier },
      taskGroup: { id: shared.taskGroupIdentifier },
      taskWorkflowTemplate: { id: createdTaskWorkflowTemplateId }
    }

    const response = await request
      .post('/api/v1/taskWorkflow')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.taskList.id).toBe(shared.taskListIdentifier)
    expect(response.body.taskGroup.id).toBe(shared.taskGroupIdentifier)

    // eslint-disable-next-line no-unused-vars
    deployedWorkflowId = response.body.id
    console.log(`Deployed Workflow with ID: ${deployedWorkflowId}`)
  })

  test('Should successfully add a task under the workflow', async () => {
    if (!deployedWorkflowId) {
      throw new Error('Deployed Workflow ID from deployment step not found')
    }

    const payload = {
      description: taskName,
      // task: { id: deployedWorkflowId }
      taskList: { id: shared.taskListIdentifier },
      taskGroup: { id: deployedWorkflowId }
    }

    const response = await request
      .post('/api/v1/task')
      .set(header)
      .send(payload)
      .expect(200)

    // expect(response.body.name).toBe(payload.name)
    expect(response.body.description).toBe(payload.description)

    taskId = response.body.id
    console.log(`Added Task with ID: ${response.body.id}`)
  })

  test('Should successfully update the description(title) of the task', async () => {
    if (!deployedWorkflowId) {
      throw new Error('Deployed Workflow ID from deployment step not found')
    }

    const payload = {
      description: taskName + ' - updated'
    }

    const response = await request
      .patch(`/api/v1/task/${taskId}`)
      .set(header)
      .send(payload)
      .expect(200)

    console.log(`Updated Task Status to: ${payload.description}`)
  })

  // update the deployed workflow
  test('Should successfully update the deployed workflow', async () => {
    if (!deployedWorkflowId) {
      throw new Error('Deployed Workflow ID from deployment step not found')
    }

    const payload = {
      name: workflowName + ' - updated'
    }

    const response = await request
      .patch(`/api/v1/taskWorkflow/${deployedWorkflowId}`)
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.name).toBe(payload.name)
    console.log(`Updated Workflow Name to: ${payload.name}`)
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
