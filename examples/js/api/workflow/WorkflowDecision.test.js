'use strict'

const shared = require('../../shared.js')
const request = require('supertest')(shared.apiUrl)
const { expect, test, beforeAll, describe, beforeEach, afterEach } = require('@jest/globals')
const { nanoid } = require('nanoid')

describe('Workflow Decision', () => {
  let createdTaskWorkflowTemplateId = null
  let header
  const workflowName = `Test Workflow ${nanoid()}`
  const workflowTemplateType = 'SMARTFLOW' // `WORKFLOW` or `SMARTFLOW`

  let parentTaskId
  let childId1
  let childId2
  let taskOutcomeId1
  let taskOutcomeId2
  let taskOutcomeIdentifier

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
    console.log(`Created Workflow with name: ${workflowName}`)
  })

  test('Should successfully add a parent task under the workflow', async () => {
    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Deployed Workflow ID from deployment step not found')
    }

    const payload = {
      description: 'Parent task',
      taskWorkflow: { id: createdTaskWorkflowTemplateId },
      taskList: { id: null },
      intentType: 'DECISION'

    }

    const response = await request
      .post('/api/v1/task')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.description).toBe(payload.description)

    parentTaskId = response.body.id
    console.log(`Added Task with ID: ${response.body.id}`)
  })

  test('Should successfully add child task 1 under the workflow', async () => {
    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Workflow ID from deployment step not found')
    }

    const payload = {
      description: 'Child task 1',
      taskWorkflow: { id: createdTaskWorkflowTemplateId },
      taskList: { id: null },
      intentType: 'STANDARD'
    }

    const response = await request
      .post('/api/v1/task')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.description).toBe(payload.description)

    childId1 = response.body.id
    console.log(`Added Task with ID: ${response.body.id}`)
  })

  test('Should successfully add child task 2 under the workflow', async () => {
    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Workflow ID from deployment step not found')
    }

    const payload = {
      description: 'Child task 2',
      taskWorkflow: { id: createdTaskWorkflowTemplateId },
      taskList: { id: null },
      intentType: 'STANDARD'
    }

    const response = await request
      .post('/api/v1/task')
      .set(header)
      .send(payload)
      .expect(200)

    expect(response.body.description).toBe(payload.description)

    childId2 = response.body.id
    console.log(`Added Task with ID: ${response.body.id}`)
  })

  test('Should successfully create a task outcome 1', async () => {

    const payload = {
      name: 'Task Outcome 1'
    }

    const response = await request
      .post(`/api/v1/outcome/${parentTaskId}`)
      .set(header)
      .send(payload)
      .expect(200)

    taskOutcomeId1 = response.body.taskOutcomeIdentifier
  })

  test('Should successfully create a task outcome 2', async () => {

    const payload = {
      name: 'Task Outcome 2'
    }

    const response = await request
      .post(`/api/v1/outcome/${parentTaskId}`)
      .set(header)
      .send(payload)
      .expect(200)

    taskOutcomeId2 = response.body.taskOutcomeIdentifier
  })

  test('Should successfully add a link between two tasks 1', async () => {

    const payload = {
      sourceTaskIdentifier: parentTaskId,
      targetTaskIdentifier: childId1,
      isDependent: true,
      taskOutcomeIdentifier: taskOutcomeId1
    }

    const response = await request
      .post('/api/v1/link/')
      .set(header)
      .send(payload)
      .expect(200)
  })

  test('Should successfully add a link between two tasks 2', async () => {

    const payload = {
      sourceTaskIdentifier: parentTaskId,
      targetTaskIdentifier: childId2,
      isDependent: true,
      taskOutcomeIdentifier: taskOutcomeId2
    }

    const response = await request
      .post('/api/v1/link/')
      .set(header)
      .send(payload)
      .expect(200)
  })

  test('Should successfully deploy a workflow template', async () => {

    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Task Workflow Template ID from creation step not found')
    }

    // TODO: Update tests to create task list and group as needed (make standalone).
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
    const deployedWorkflowId = response.body.id
    console.log(`Deployed Workflow with ID: ${response.body.id}`)

    // // select outcome based on the index
    // taskOutcomeIdentifier = response.body.tasks[0].taskOutcomes[0].taskOutcomeIdentifier

    // select outcome based on the outcome name
    const taskOutcomes = response.body.tasks[0].taskOutcomes
    for (let i = 0; i < taskOutcomes.length; i++) {
      if (taskOutcomes[i].name === 'Task Outcome 1') {
        taskOutcomeIdentifier = taskOutcomes[i].taskOutcomeIdentifier
        break
      }
    }

    if (taskOutcomeIdentifier) {
      console.log('Task Outcome Identifier:', taskOutcomeIdentifier)
    } else {
      console.log('No Task Outcome with the name "Task Outcome 1" found')
    }
    console.log('taskOutcomeIdentifier: ', taskOutcomeIdentifier)
  })

  test('Should select task outcome 1', async () => {
    const response = await request
      .patch(`/api/v1/select/${taskOutcomeIdentifier}`)
      .set(header)
      .expect(200)
  })
})
