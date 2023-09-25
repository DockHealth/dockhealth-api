'use strict'

const shared = require('../../shared.js')
const request = require('supertest')(shared.apiUrl)
const { expect, test, beforeAll, describe, beforeEach, afterEach } = require('@jest/globals')
const { nanoid } = require('nanoid')

describe('Workflow', () => {
  let createdTaskWorkflowTemplateId = null
  let header
  const workflowName = `Test Workflow ${nanoid()}`
  const workflowTemplateType = 'SMARTFLOW' // `WORKFLOW` or `SMARTFLOW`

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
  })

  test('Should successfully get a workflow template', async () => {
    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Task Workflow Template ID from creation step not found')
    }

    const response = await request
      .get(`/api/v1/taskWorkflowTemplate/${createdTaskWorkflowTemplateId}`)
      .set(header)
      .expect(200)

    expect(response.body.name).toBe(workflowName)
    expect(response.body.templateType).toBe(workflowTemplateType)
    console.log(`Retrieved Workflow with ID: ${createdTaskWorkflowTemplateId}`)
  })

  test('Should successfully update a workflow template', async () => {
    if (!createdTaskWorkflowTemplateId) {
      throw new Error('Task Workflow Template ID from creation step not found')
    }

    const updatedWorkflowName = workflowName + '- updated'
    const updatePayload = {
      name: updatedWorkflowName
    }

    const response = await request
      .patch(`/api/v1/taskWorkflowTemplate/${createdTaskWorkflowTemplateId}`)
      .set(header)
      .send(updatePayload)
      .expect(200)

    expect(response.body.name).toBe(updatedWorkflowName)
    console.log(`Updated Workflow Name to: ${updatedWorkflowName}`)
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
