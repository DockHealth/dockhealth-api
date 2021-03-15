# Dock Health API Developer Quickstart

This overview will explain the basic guidelines and conventions of the Dock Health API. It contains all the necessary 
instructions and examples to get you up and running with Dock Health.

The Dock Health API follows standard REST conventions. While the examples shown here use cURL, the API is accessible 
using any convenient HTTPS client library in the programming language of your choice.

## Step 1: Create an Account

Integrating Dock Health into your application begins with the creation of your initial Dock Health user account at:
<https://app.dock.health>. Creation of the account will require a **business email address**, **password**, **mobile
phone** for two-factor authentication via SMS, and your **organization name**. 

This account will function as your initial account owner, so you should use an email address and phone appropriate for 
administrative accounts. The organization name can be any name of your choosing but must be unique across all of Dock 
Health. For this reason, we recommend that you use your organization's domain name. 

Once this initial account is set up, you can use the API to create additional organizations and users.

## Step 2: Request Your API Keys From Dock Health

Dock Health authenticates your requests using your developer API keys, which consist of an `api_key`, `client_id` and a 
`client_secret`. 

Email Dock Health at <mailto://support@dock.health> to request your keys.
You will need to supply the **email address** of the account you created in Step 1.

To protect your data, make sure to keep your API keys private -- do not share them via email or messaging, and do not 
commit them to any source code repositories. Dock Health recommends creating `API_KEY`, `CLIENT_ID`, and`CLIENT_SECRET` 
environment variables in your development and deployment environments and referencing those environment variables in 
your code.

## Step 3: Setup Your Environment

Dock Health supports two environments. Use the `DEVELOPMENT` environment to test your code and the `PRODUCTION` 
environment for your live application. To make changing environments easier, we recommend creating two additional
environment variables:

- `AUTH_URL` should be set to the Dock Health Authorization server URL appropriate for your environment:
  - DEVELOPMENT: <https://dock-health-dev.auth.us-east-1.amazoncognito.com/oauth2/token>
  - PRODUCTION: <https://dock-health.auth.us-east-1.amazoncognito.com/oauth2/token>
- `API_URL` should be set to the Dock Health API server URL appropriate for your environment:
  - DEVELOPMENT: <https://partner-api-dev.dockhealth.app>
  - PRODUCTION: <https://partner-api.dockhealth.app>

## Step 4: Request an Authorization Token

Each request you make to the Dock Health API requires you to supply an Authorization token. The request must contain
three elements:

- The `client_id` you requested in Step 2.
- The `client_secret` you requested in Step 2.
- The scope(s) of the request. These must be one or more of the following and will be explained in detail later:
  - `system.developer.read` - Read developer info as the system account.
  - `system.org.read` - Read org info as the system account.
  - `system.user.read` - Read user info as the system account.
  - `user.all.read` - Read data accessible by the specified user.
  - `user.all.write` - Write data accessible by the specified user.
  - `patient.all.read` - Read data associated with the specified patient.
  - `patient.all.write` - Write data associated with the specified patient.
  
Example Authorization Request:

```bash
curl --request POST \
--url $AUTH_URL \
--data grant_type=client_credentials \
--data client_id=6hpoti31ci9jfpissif9tkluln \
--data client_secret=u5lo235n3ssp4im9qep06jjf096kueq9piopvi3a0322jsr9amo \
--data scope="dockhealth/system.developer.read dockhealth/system.developer.write"
```

**IMPORTANT: Multiple scopes must be separated by a single space!**

Example Authorization Response: 

```bash
{
  "access_token": "eyJraWQiOiJyYTAraGdJUlhDTEZJNlNKY0ladjNMdmVITUJoTDhGTGhOWEhLRWFCNlwvST0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI2aHBvdGkzMWNpOWpmcGlzc2lmOXRrbHVsbiIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiaHR0cHM6XC9cL2ludGVybmFsLWFwaS1kZXYuZG9ja2hlYWx0aC5hcHBcL2FsbC5yZWFkIiwiYXV0aF90aW1lIjoxNjA0NTI3MjQ5LCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV8wRTRnSW12S1oiLCJleHAiOjE2MDQ1Mjc1NDksImlhdCI6MTYwNDUyNzI0OSwidmVyc2lvbiI6MiwianRpIjoiM2E5OGEwMzYtNTJjYy00OGI4LWFkN2ItZDY4OWIxOTFjNmY3IiwiY2xpZW50X2lkIjoiNmhwb3RpMzFjaTlqZnBpc3NpZjl0a2x1bG4ifQ.BefiIDU8X4Miqb7c_BsrO0XBGOUiPbau8qF6ka0s_0diTPoI5Na6R31-ZZxgoJhgowJfrGGjbjCl2wILRqWe0CWKLdwe2y4mAixW7c7RC44tH2VV1IMMYz5E7jPkQaxay-9JWHwoujwKYnky1mEB4ZLNkHxIe4bcUeQT5CXtllvgzaQltY51h16vO3PtC0DRpXmrj0lmGlcw23spkh5pyAMIkdQLiyMGLDE-TeiNnew1-9lRPUBVSLuJjtUCSOneLVGeW5MI63_sWdj1kSvuq1V2tdeTJOdrWOz93fhog7P8sGcv39XUgVit0TQonaMfA7BnhP9NBDt3iWbN4dUr1g",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

A successful authorization request will return an `access_token`, which must be supplied in subsequent requests. The 
access token supplied will expire after `expires_in` seconds, after which, you must request a new token. Requests 
made with same access token will be limited to the scopes specified when requesting the token. 

While it is currently permissible to specify multiple scopes when requesting an access token it is highly recommended 
that you specify a single scope and request an access token for each scope needed.

## Step 4: Make Your First Dock Health API Request

You are now able to make an authenticated API request. All API requests require at least the following headers:

- `x-api-key` must be set to the `API_KEY` you received from Dock Health.
- `Authorization` must be set to the `access_token` value you received when making your Authorization request in Step 3.

Authenticated requests also require that the scope requested in your Authorization request matches the scope required
for the specified endpoint. See the rest of this quickstart, as well as the API reference for the scope required for 
each endpoint. The Dock Health API reference is available in three formats - OpenAPI (yaml), Redoc, and Swagger:

- DEVELOPMENT:
  - OpenAPI: <https://partner-api-dev.dockhealth.app/api-docs>
  - Redoc: <https://partner-api-dev.dockhealth.app/api-docs/redoc>
  - Swagger: <https://partner-api-dev.dockhealth.app/api-docs/swagger-ui.html>
- PRODUCTION:
  - OpenAPI: <https://partner-api.dockhealth.app/api-docs>
  - Redoc: <https://partner-api.dockhealth.app/api-docs/redoc>
  - Swagger: <https://partner-api.dockhealth.app/api-docs/swagger-ui.html>

For example, to request your Developer account info, you must request `dockhealth/system.developer.read` scope when
making your Authorization request, and supply the returned `access_token` as the authorization header, along with your
api key:

Example Request:

```bash
curl --request GET \
--url $API_URL/api/v1/developer \
--header "x-api-key: ypAnaCur3laAOgrGNUFze5CT9pc3T0ch7rh8KOpl" \
--header "Authorization: eyJraWQiOiJyYTAraGdJUlhDTEZJNlNKY0ladjNMdmVITUJoTDhGTGhOWEhLRWFCNlwvST0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI2aHBvdGkzMWNpOWpmcGlzc2lmOXRrbHVsbiIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiZG9ja2hlYWx0aFwvc3lzdGVtLmRldmVsb3Blci5yZWFkIiwiYXV0aF90aW1lIjoxNjE0NTU0OTMzLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV8wRTRnSW12S1oiLCJleHAiOjE2MTQ1NTUyMzMsImlhdCI6MTYxNDU1NDkzMywidmVyc2lvbiI6MiwianRpIjoiMjU3ZTRkZGYtNThmZi00MGVlLThiNWEtMzE1MjkxMGQ1NDQ4IiwiY2xpZW50X2lkIjoiNmhwb3RpMzFjaTlqZnBpc3NpZjl0a2x1bG4ifQ.XRUBBdgGOCRcy4WW4mjEaGcc4W9S-JV0AbuKmM2PlQvqopmzizETN_NSz-3ScLbfyd_g5JO0Jfr2eimnMQSeYDU3sVhSs1CNiT8VhEps_9BVwvthQtFdFAnjzGXM7FSsSp-7amzb4Q29KtlIP3tUsgM6mmgha4c3fcRBmP1RDw2op6NP5sUrQRamQz7gz-PLqjEUJS1fSJLCR1Wcp05LaHIgaOlhCfDMzLBTV7UXC9WqmpQ6yFWYZuVmwOq8rwCrEeqXZ0oVvarDuwpx1pWVOUAUKq4giEj_hy8CjzdXkqyfyEt1-BZe93gFWuqgAZVOrVp4OgEqUp8KX6SDnfoh3A"
```

Example Response:

```json
{
  "contactName": "John Smith",
  "contactEmail": "john.smith@example.com",
  "contactPhone": "1-212-555-1212",
  "organizations": [
    {
      "organizationIdentifier": "3cec036e-604d-45a9-b83c-0bb7aa157baa",
      "name": "Smith Clinic, P.C.",
      "subscription": "30 Day Trial"
    }
  ]
}
```

## Step 5: Next Steps

Congratulations! You should now be able to make full use of the Dock Health API in your own applications. 

See the remainder of this README for more information on the data model, request scopes, request format, and errors.

The Dock Health API Developer Guide (this document) and client examples are available at our public
GitHub API repository (this repo): <https://github.com/DockHealth/dockhealth-api>.

Please see the examples section of this repo for full working examples covering the full onboarding lifecycle!

The Dock Health API reference is available in three formats - OpenAPI (yaml), Redoc, and Swagger:

- DEVELOPMENT:
  - OpenAPI: <https://partner-api-dev.dockhealth.app/api-docs>
  - Redoc: <https://partner-api-dev.dockhealth.app/api-docs/redoc>
  - Swagger: <https://partner-api-dev.dockhealth.app/api-docs/swagger-ui.html>
- PRODUCTION:
  - OpenAPI: <https://partner-api.dockhealth.app/api-docs>
  - Redoc: <https://partner-api.dockhealth.app/api-docs/redoc>
  - Swagger: <https://partner-api.dockhealth.app/api-docs/swagger-ui.html>
  
Finally, if you have any trouble, please don't hesitate to reach out for help. Either:

1. Create an issue in this repo: <https://github.com/DockHealth/dockhealth-api/issues>.
2. Email us at <mailto://support@dock.health>. 

Thanks for using Dock Health!

## Dock Health API Data Model

- A single `Developer` has one or more `Organizations`.
  - A single `Organization` has one or more `Patients`.
    - A single `Patient` has one or more `Notes`.
  - A single `Organization` has one or more `Users`.
  - A single `Organization` has one or more `Lists`.
    - A single `List` has one or more `Groups`.
      - A single `Group` has one or more `Tasks`.
        - A single `Task` has zero or more `SubTasks`.
          - A single `Task` has zero or one existing `Patients`.
          - A single `Task` or `SubTask` has zero or more `Assignees`, which are existing `Users`.
          - A single `Task` or `SubTask` has zero or more `Attachments`.
          - A single `Task` or `SubTask` has zero or more `Comments`.
  
## Request Scopes

Scopes are loosely based on the FHIR standard, with the following deviations from the standard:
- Dock Health scope names use dots `.` instead of slashes `/` as separators. 
- Dock Health does not allow wildcard `*.` scopes.

The naming convention is defined as follows:

```properties
scope-name            = resource-context "." resource-type "." modification-rights
resource-context      = ("system" / "user" / "patient")
resource-type         = (name) # `all` used in place of wildcards
modification-rights   = ("read" / "write")
```

### System Scopes

- `system.developer.read` - Read developer info as the system account.
- `system.org.read` - Read org info as the system account.
- `system.user.read` - Read user info as the system account.

IMPORTANT: The `system` scopes are limited! All other activity must happen on behalf of a user!

### User Scopes:

- `user.all.read` - Read data accessible by the specified user.
- `user.all.write` - Write data accessible by the specified user.

NOTE: An org is required for user operations, and the user must be part of the specified org.

### Patient Scopes

- `patient.all.read` - Read data associated with the specified patient.
- `patient.all.write` - Write data associated with the specified patient.

NOTE: A user and org are for patient operations, and the user and patient must be part of the specified org.

## Request Headers

- SYSTEM requests require two headers to be set:
  - `x-api-key` must be set to your api key created during account provisioning.
  - `Authorization` must be set to the `access_token` returned from your Authentication request.
    - The `access_token` in turn contains your `client_id`, `client_secret`, and `scopes`.
- ORGANIZATION requests require the SYSTEM headers AND one additional header:
  - `x-user-id` must be set to the identifier of a given user.
- ALL OTHER requests require the SYSTEM headers, AND two additional headers:
  - `x-user-id` must be set to the identifier of a given user.
  - `x-organization-id` must be set to the identifier of an organization to which the specified user is a member.
  
## Dock Health API Endpoint Format

Dock Health endpoints generally follow these usage conventions:

### Get Single Entities: `GET /<version>/<entity>/<entityIdentifier>`
`GET /v1/user/160f9192-40c2-11ea-a4e8-124feabd863a` returns the user for the specified `userIdentifier`.

NOTE that the `entity` is referred to in the **singular** even when getting a list:
`GET /v1/user` returns a list of users.
`GET /v1/user/someuseridentifier` returns a single user.

### Search For Entities Matching the Given Parameters: `GET /<version>/<entity>?param1=&param2=`
`GET /v1/organization` returns a list of organizations for the `USER_ID` supplied in the request header:
`GET /v1/user` returns a list of users for the `ORGANIZATION_ID` and `USER_ID` supplied in the request headers:

### Create Entities: `POST /version/<entity>`
`POST /v1/user` creates a new user.

### Update (Patch) Entities: `PATCH /version/<entity>/<entityIdentifier>`
`PATCH /v1/user/someuseridentifier` updates the supplied values ONLY on the existing user.

### Update (Replace) Entities: `PUT /version/<entity>/<entityIdentifier>`
`PUT /v1/user/someuseridentifier` entirely replaces the existing user with the supplied values.

### Delete Entities: `DELETE /version/<entity>/<entityIdentifier>`
`DELETE /v1/user/someuseridentifier` (soft) deletes an existing user.

**IMPORTANT**: Currently, Dock Health ONLY supports soft-deletions! Any deleted item is actually still retrievable via
the API, but its `active` attribute will be set to `false`. 

To fetch only non-deleted (`active`) items from the API, use the `search` endpoints, supplying `active=true` as one
of the search parameters. Alternatively, retrieve items from the API and filter any inactive items from the returned 
results.

## Dock Health API Errors

Dock Health uses conventional HTTP response codes to indicate the success or failure of an API request. In general: 
- Codes in the 2xx range indicate success.
- Codes in the 4xx range indicate an error that failed given the information provided. 
- Codes in the 5xx range indicate an error with Dock Health servers.

Specific Error Codes:

```
200 - OK. Everything worked as expected.
201 - Created. The requested item was created as expected.
400 - Bad Request. The request was unacceptable, often due to missing a required parameter.
401 - Unauthorized.	No valid API key provided.
402 - Request Failed. The parameters were valid but the request failed.
403 - Forbidden. The API key doesn't have permissions to perform the request.
404 - Not Found. The requested resource doesn't exist.
409 - Conflict. The request conflicts with another request (perhaps due to using the same idempotent key).
429 - Too Many Requests. Too many requests hit the API too quickly. We recommend an exponential backoff of your requests.
5xx - Server Errors. 
```

In the event of an error, an error response will also be returned. Error responses have the following attributes:
- `timestamp` The timestamp at which the error occurred.
- `status` The http status code of the error. This will match the http status code returned by the server.
- `error` The error message corresponding to the http status code.
- `message` The Dock Health error message specific to the error that occurred.
- `path` The URI of the request that generated the error.

Example Error Response:

```json
{
  "timestamp": "2021-03-01T19:45:25.064Z",
  "status": 403,
  "error": "Forbidden",
  "message": "HeyDocAccessDeniedException: Not authorized to access patient note: 51b95ccd-4bbe-11ea-a4e8-124feabd863a",
  "path": "/api/v1/patient/b7b51675-316d-4f60-a8b2-93b19f93129b/note/51b95ccd-4bbe-11ea-a4e8-124feabd863a"
}
```

## Additional Dock Health API Developer Info

The Dock Health API Developer Guide (this document) and client examples are available at our public
GitHub API repository (this repo): <https://github.com/DockHealth/dockhealth-api>.

Please see the examples section of this repo for full working examples covering the full onboarding lifecycle!

The Dock Health API reference is available in three formats - OpenAPI (yaml), Redoc, and Swagger:

- DEVELOPMENT:
  - OpenAPI: <https://partner-api-dev.dockhealth.app/api-docs>
  - Redoc: <https://partner-api-dev.dockhealth.app/api-docs/redoc>
  - Swagger: <https://partner-api-dev.dockhealth.app/api-docs/swagger-ui.html>
- PRODUCTION:
  - OpenAPI: <https://partner-api.dockhealth.app/api-docs>
  - Redoc: <https://partner-api.dockhealth.app/api-docs/redoc>
  - Swagger: <https://partner-api.dockhealth.app/api-docs/swagger-ui.html>

## Contact Us

If you have any trouble, please don't hesitate to reach out for help. Either:

1. Create an issue in this repo: <https://github.com/DockHealth/dockhealth-api/issues>.
2. Email us at <mailto: support@dock.health>. 

