# Dock Health API Developer Quickstart

This overview will explain the basic guidelines and conventions of the Dock Health API. It contains all the necessary 
instructions and examples to get you up and running with Dock Health.

The Dock Health API follows standard REST conventions. While the examples shown here use cURL, the API is accessible 
using any convenient HTTPS client library in the programming language of your choice.

## Create an Account

Integrating Dock Health into your application begins with the creation of your initial Dock Health user account at:
<https://app.dock.health>. Creation of the account will require a **business email address**, **password**, **mobile
phone** for two-factor authentication via SMS, and your organization's **domain** and **name**. 

This account will function as your initial account owner, so you should use an email address and phone appropriate for 
administrative accounts. The organization name can be any name of your choosing but must be unique across all of Dock 
Health. For this reason, we recommend that you use your organization's domain name. 

**IMPORTANT**: Make a note of the `domain` and `email` address used to create your account in Dock Health.
**IMPORTANT**: You will need them to continue provisioning your developer account!

Once this initial account is set up, you can use the API to create additional organizations and users.

## Request Your API Keys From Dock Health

Dock Health authenticates your requests using your developer API keys, which consist of an `api_key`, `client_id`,
`client_secret`, `organization_identifier`, and `user_identifier`. 

Email Dock Health at <mailto://support@dock.health> to request your keys.
You will need to supply the **domain** and **email** of the account you created in Step 1.

To protect your data, make sure to keep your API keys private -- do not share them via email or messaging, and do not 
commit them to any source code repositories. Dock Health recommends creating `API_KEY`, `CLIENT_ID`, `CLIENT_SECRET`,
`ORGANIZATION_IDENTIFIER`, and `USER_IDENTIFIER` environment variables in your environments and referencing those 
environment variables in your code.

## Setup Your Environment

Dock Health supports two environments. Use the `DEVELOPMENT` environment to test your code and the `PRODUCTION` 
environment for your live application. To make changing environments easier, we recommend creating two additional
environment variables:

- `AUTH_URL` should be set to the Dock Health Authorization server URL appropriate for your environment:
  - DEVELOPMENT: <https://partner-auth-dev.dockhealth.app>
  - PRODUCTION: <https://partner-auth.dock.health>
- `API_URL` should be set to the Dock Health API server URL appropriate for your environment:
  - DEVELOPMENT: <https://partner-api-dev.dockhealth.app>
  - PRODUCTION: <https://partner-api.dock.health>

## Install Dependencies

- Install Node.js: <https://nodejs.org>
- Install the Jest test framework (<https://jestjs.io>) as a global Node dependency: `npm install --global jest`
- (Webhooks Only) Install ngrok: <https://ngrok.com>
- Clone the Dock Health API repository to your development environment: `git clone git@github.com:DockHealth/dockhealth-api.git`
- Run `npm install` to install the dependencies listed in `package.json`.

## Setup Your Environment Variables

The examples require the following environment variables to be set:

```shell
AUTH_URL = https://dock-health-dev.auth.us-east-1.amazoncognito.com
API_URL = https://partner-api-dev.dockhealth.app
API_KEY = "The API_KEY you received from Dock Health."
CLIENT_ID = "The CLIENT_ID you received from Dock Health."
CLIENT_SECRET = "The CLIENT_SECRET you received from Dock Health."
ORGANIZATION_IDENTIFIER = The ORGANIZATION_IDENTIFIER you received from Dock Health.
USER_IDENTIFIER = The USER_IDENTIFIER you received from Dock Health.
CALLBACK_URL = "(Webhooks Only) If NOT USING NGROK, a proxy URL to proxy webhook verification calls back to your local server."
CALLBACK_LOCAL_PORT = "(Webhooks Only) The port on which your local express server is running (defaults to 3000)."
NGROK_AUTHTOKEN = (Webhooks Only) If USING NGROK, your ngrok auth token.
```

You can set the env vars directly in your shell, or you can create an environment file on disk to contain those values. 
If the env file is present, the examples will read the vars from the file. If the file is not present, the examples
will read the vars from the environment.

There is a sample env file, `.env.sample` included with the examples. To use it an env file, copy the sample to a new 
file, `.env.test` and supply the missing values.

Make sure to add `.env.test` to your `.gitignore` to prevent pushing them to your remotes! See the`.gitignore` file 
in this repo to see how to exclude this file!

## Run the API Lifecycle Example

From the `dockhealth-api` directory, run:

```shell
jest ./examples/js/api/lifecycle.test.js`
```

## Run the Webhooks Authorization Example (Optional)

The webhook example requires additional setup, and an overview of the authorization process.
Please see `WEBHOOKS.md` for more information on the webhook concepts.

Webhook authorization requires the developer to host a public-facing REST endpoint at the URL provided when 
setting up the webhook. Dock Health will call that endpoint with an authentication challenge, and the endpoint 
must return the properly-hashed and signed response.

In order to facilitate running the example on localhost, the example code sets up a one-shot express.js REST server
listening on `localhost:3000`. That port can be changed by setting `CALLBACK_LOCAL_PORT` in your environment.

The example shows how to construct the response to the authentication challenge. 
See the code in `shared.js` for an example of constructing the challenge response.

To make that endpoint available publicly, we recommend that you create a free ngrok account: <https://ngrok.com>.
ngrok is a service that proxies a publicly-routable URL to an endpoint running locally in your environment.

Alternatively if you are already running a proxy to your local machine, set `CALLBACK_URL` and `CALLBACK_PORT`
to specify that remote url and local proxy port.

## Requesting an Authorization Token

Each request you make to the Dock Health API requires you to supply an Authorization token. The request must contain
three elements:

- The `client_id` you requested in Step 2.
- The `client_secret` you requested in Step 2.
- The scope(s) of the request. These must be one or more of the following and will be explained in detail later:
  - `user.all.read` - Read data accessible by the specified user.
  - `user.all.write` - Write data accessible by the specified user.
  - `patient.all.read` - Read data associated with the specified patient.
  - `patient.all.write` - Write data associated with the specified patient.
  
Example Authorization Request:

```bash
curl --request POST \
--url $AUTH_URL/oauth2/token \
--data grant_type=client_credentials \
--data client_id=7g6n9c10zl2ktkd52vff8glfln \
--data client_secret=2hafgq78dbhqal73tgs003345getyyuldggh54dsgfsjg563amo \
--data scope="dockhealth/user.all.read dockhealth/user.all.write dockhealth/patient.all.read dockhealth/patient.all.write"
```

**IMPORTANT: Multiple scopes must be separated by a single space!**

Example Authorization Response: 

```bash
{
  "access_token": "eyJraWQiOiJyYTAraGdJUlhDTEZJNlNKY0ladjNMdmVITUJoTDJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI2aHBvdGkzMWNpOWpmcjY2VzcyIsInNjb3BlIjoiaHR0cHM6XC9cL2ludGVybmFsLWFwaS1kZXYuZG9ja2hlYWx0aC5hcHBcL2FsbC5yZWFkIiwiYXV0aF90aW1lIjoxNjA0NTI3MjQ5LCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV8wRTRnSW12S1oiLCJleHAiOjE2MDQ1Mjc1NDksImlhdCI6MTYwNDUyNzI0OSwidmVyc2lvbiI6MiwianRpIjoiM2E5OGEwMzYtNTJjYy00OGI4LWFkN2ItZDY4OWIxOTFjNmY3IiwiY2xpZW50X2lkIjoiNmhwb3RpMzFjaTlqZnBpc3NpZjl0a2x1bG4ifQ.BefiIDU8X4Miqb7c_BsrO0XBGOUiPbau8qF6ka0s_0diTPoI5Na6R31-ZZxgoJhgowJfrGGjbjCl2wILRqWe0CWKLdwe2y4mAixW7c7RC44tH2VV1IMMYz5E7jPkQaxay-9JWHwoujwKYnky1mEB4ZLNkHxIe4bcUeQT5CXtllvgzaQltY51h16vO3PtC0DRpXmrj0lmGlcw23spkh5pyAMIkdQLiyMGLDE-TeiNnew1-9lRPUBVSLuJjtUCSOneLVGeW5MI63_sWdj1kSvuq1V2tdeTJOdrWOz93fhog7P8sGcv39XUgVit0TQonaMfA7BnhP9NBDt3iWbN4dUr1g",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

A successful authorization request will return an `access_token`, which must be supplied in subsequent requests. The 
access token supplied will expire after `expires_in` seconds, after which, you must request a new token. Requests 
made with same access token will be limited to the scopes specified when requesting the token. 

## The Structure of an API Request

You are now able to make an authenticated API request. All API requests require at least the following headers:

- `x-api-key` must be set to the `API_KEY` you received from Dock Health.
- `Authorization` must be set to the `access_token` value you received when making your Authorization request in Step 3.

Authenticated requests also require that the scope requested in your Authorization request matches the scope required
for the specified endpoint. See the rest of this quickstart, as well as the API reference for the scope required for 
each endpoint. The Dock Health API reference is available in three formats - OpenAPI (yaml), Redoc, and Swagger:

- OpenAPI: <https://partner-api-dev.dockhealth.app/api-docs>
- Redoc: <https://partner-api-dev.dockhealth.app/api-docs/redoc>
- Swagger: <https://partner-api-dev.dockhealth.app/api-docs/swagger>

Example Request:

```bash
curl --request GET \
--url $API_URL/api/v1/user \
--header "x-api-key: jga49hff490msgeyytihbm35f138dfchhgj63Opl" \
--header "Authorization: eyJraWQiOiJyYTAraGdJUlhDTEZJNlNKY0ladjNMdmVITUJoTDhGTGhOWEhLRWFCNlwvST0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI2aHBvdGkzMWNpOWpmcGlzc2lmOXRrbHVsbiIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiZG9ja2hlYWx0aFwvc3lzdGVtLmRldmVsb3Blci5yZWFkIiwiYXV0aF90aW1lIjoxNjE0NTU0OTMzLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV8wRTRnSW12S1oiLCJleHAiOjE2MTQ1NTUyMzMsImlhdCI6MTYxNDU1NDkzMywidmVyc2lvbiI6MiwianRpIjoiMjU3ZTRkZGYtNThmZi00MGVlLThiNWEtMzE1MjkxMGQ1NDQ4IiwiY2xpZW50X2lkIjoiNmhwb3RpMzFjaTlqZnBpc3NpZjl0a2x1bG4ifQ.XRUBBdgGOCRcy4WW4mjEaGcc4W9S-JV0AbuKmM2PlQvqopmzizETN_NSz-3ScLbfyd_g5JO0Jfr2eimnMQSeYDU3sVhSs1CNiT8VhEps_9BVwvthQtFdFAnjzGXM7FSsSp-7amzb4Q29KtlIP3tUsgM6mmgha4c3fcRBmP1RDw2op6NP5sUrQRamQz7gz-PLqjEUJS1fSJLCR1Wcp05LaHIgaOlhCfDMzLBTV7UXC9WqmpQ6yFWYZuVmwOq8rwCrEeqXZ0oVvarDuwpx1pWVOUAUKq4giEj_hy8CjzdXkqyfyEt1-BZe93gFWuqgAZVOrVp4OgEqUp8KX6SDnfoh3A"
```

Example Response:

```json
[
  {
    "identifier": "3cec036e-604d-45a9-b83c-0bb7aa157baa",
    "externalIdentifier": "1dfd036e-604d-45a9-b83c-0bb7aa158cbd",
    "email": "john.smith@example.com",
    "firstName": "John",
    "lastName": "Smith"
  }
]
```

## Next Steps

Congratulations! You should now be able to make full use of the Dock Health API in your own applications. 

See the remainder of this README for more information on the data model, request scopes, request format, and errors.

The Dock Health API Developer Guide (this document) and client examples are available at our public
GitHub API repository (this repo): <https://github.com/DockHealth/dockhealth-api>.

Please see the examples section of this repo for full working examples covering the full onboarding lifecycle!
 
Finally, if you have any trouble, please don't hesitate to reach out for help. Either:

1. Create an issue in this repo: <https://github.com/DockHealth/dockhealth-api/issues>.
2. Email us at <mailto://support@dock.health>. 

Thanks for using Dock Health!

