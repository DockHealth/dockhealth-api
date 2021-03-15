'use strict'

/* Needed for standard.js to not complain about Jest global namespace functions. */
/* eslint-env jest */

// Must add to prevent CORS error when axios unwinds error response in Jest tests.
global.XMLHttpRequest = undefined

jest.setTimeout(60000) // 60 secs.

if (process.env.NODE_ENV !== 'production') {
  require('custom-env').env(process.env.NODE_ENV)
}

const HEADER_AUTHORIZATION = 'Authorization'
const HEADER_API_KEY = 'x-api-key'
const HEADER_USER_ID = 'x-user-id'
const HEADER_ORGANIZATION_ID = 'x-organization-id'
const GENERATED_ITEM_LENGTH = 8

const authUrl = process.env.AUTH_URL
const apiUrl = process.env.API_URL
const apiKey = process.env.API_KEY
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

const auth = require('supertest')(authUrl)
const { nanoid } = require('nanoid')

const devHeaders = (token) => {
  if (!token) {
    throw new Error('Token is undefined!')
  }
  let json = {}
  json[HEADER_AUTHORIZATION] = token
  json[HEADER_API_KEY] = apiKey
  return json
}

const userHeaders = (token, userIdentifier) => {
  if (!token) {
    throw new Error('Token is undefined!')
  }
  if (!userIdentifier) {
    throw new Error('User identifier is undefined!')
  }
  let json = {}
  json[HEADER_AUTHORIZATION] = token
  json[HEADER_API_KEY] = apiKey
  json[HEADER_USER_ID] = userIdentifier
  return json
}

const userAndOrgHeaders = (token, userIdentifier, organizationIdentifier) => {
  if (!token) {
    throw new Error('Token is undefined!')
  }
  let json = {}
  json[HEADER_AUTHORIZATION] = token
  json[HEADER_API_KEY] = apiKey
  json[HEADER_USER_ID] = userIdentifier
  json[HEADER_ORGANIZATION_ID] = organizationIdentifier
  return json
}

const generateEmail = () => {
  return (nanoid(GENERATED_ITEM_LENGTH) + '@apitest.com').toLowerCase()
}

const generateDomain = () => {
  return (nanoid(GENERATED_ITEM_LENGTH) + '-apitest.com').toLowerCase()
}

const generateMrn = () => {
  return (nanoid(GENERATED_ITEM_LENGTH)).toLowerCase()
}

const getAccessToken = async (scopes) => {
  if (!apiKey) {
    throw new Error('API_KEY is not set in the environment!')
  }
  if (!clientId) {
    throw new Error('CLIENT_ID is not set in the environment!')
  }
  if (!clientSecret) {
    throw new Error('CLIENT_ID is not set in the environment!')
  }
  if (!scopes || scopes.length === 0) {
    throw new Error('Scopes are not defined!')
  }

  // Uncomment for debugging purposes.
  //console.debug('Requesting token for scopes: ' + scopes.join(' '))
  //console.debug('Auth URL: ' + authUrl)

  return await auth
    .post('/oauth2/token')
    .type('form')
    .send({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes.join(' ') // IMPORTANT: Scopes MUST be SPACE delimited or call will fail!
    })
    .expect(200)
    .then(res => {
      // Uncomment for debugging purposes.
      //console.debug('Access token: ' + res.body.access_token)
      return res.body.access_token
    })
}

module.exports = {
  HEADER_AUTHORIZATION,
  HEADER_API_KEY,
  HEADER_USER_ID,
  HEADER_ORGANIZATION_ID,
  apiUrl,
  getAccessToken,
  devHeaders,
  userHeaders,
  userAndOrgHeaders,
  generateDomain,
  generateEmail,
  generateMrn
}
