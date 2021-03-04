# Dock Health API Javascript Examples 

These Javascript examples are written in the form of unit tests, and should provide a straightforward, repeatable
demonstration of how to use the Dock Health API in your JS codebase.

## Step 1: Create an Account

The examples require you to create a Dock Health user account at:<https://app.dock.health>. 
Creation of the account will require a **business email address**, **password**, **mobile phone** for two-factor 
authentication via SMS, and your organization's **domain** and **name**.

This account will function as your initial account owner, so you should use an email address and phone appropriate for
administrative accounts. The organization name can be any name of your choosing but must be unique across all of Dock
Health. For this reason, we recommend that you use your organization's domain name.

**IMPORTANT**: Make a note of the `domain` and `email` address used to create your account in Dock Health.
**IMPORTANT**: You will need them to run these examples!

Once this initial account is set up, you can use the API to create additional organizations and users.

## Step 2: Request Your API Keys From Dock Health

Dock Health authenticates your requests using your developer API keys, which consist of an `API_KEY`, `CLIENT_ID`, 
and`CLIENT_SECRET`.

Email Dock Health at <mailto://support@dock.health> to request your keys. 
You will need to supply the **email address** of the account you created in Step 1.

To protect your data, make sure to keep your API keys private -- do not share them via email or messaging, and do not
commit them to any source code repositories. Dock Health recommends creating `API_KEY`, `CLIENT_ID`, and`CLIENT_SECRET`
environment variables in your development and deployment environments and referencing those environment variables in
your code.

For the purpose of these examples, you can save your keys in a local environment file, `.env.test` (see the next steps).
If you do, make sure to add any `.env` files to your `.gitignore` to prevent pushing them to your remotes! See the 
`.gitignore` file in this repo to see how to exclude these files.

## Step 3. Setup Your Development Environment

1. Install Node.js: <https://nodejs.org>
   
2. Install the Jest test framework (<https://jestjs.io>) as a global Node dependency:

```shell
npm install --global jest
```   

3. Clone the Dock Health API repository to your development environment:

```shell
git clone git@github.com:DockHealth/dockhealth-api.git
```

4. Run `npm install` to install the dependencies listed in `package.json`.

## Step 3. Setup Your Environment Variables

The examples require the following environment variables to be set:

```shell
AUTH_URL = https://dock-health-dev.auth.us-east-1.amazoncognito.com
API_URL = https://partner-api-dev.dockhealth.app
API_KEY = "The API_KEY you received from Dock Health"
CLIENT_ID = "The CLIENT_ID you received from Dock Health"
CLIENT_SECRET = "The CLIENT_SECRET you received from Dock Health"
DOMAIN = "The domain name you used when creating your account and initial organization in the Dock Health app."
EMAIL = "The email address you used when creating your account and first user in the Dock Health app."
```

You can set the env vars directly in your shell, or you can create an environment file on disk to contain those values. 
If the env file is present, the examples will read the vars from the file. If the file is not present, the examples
will read the vars from the environment.

There is a sample env file, `.env.sample` included with the examples. To use it an env file, copy the sample to a new 
file, `.env.test` and supply the missing values for `API_KEY`, `CLIENT_ID`, and `CLIENT_SECRET`.

Make sure to add `.env.test` to your `.gitignore` to prevent pushing them to your remotes! See the`.gitignore` file 
in this repo to see how to exclude this file!

## Step 3. Run the Examples

CD to the `examples/js` directory and run:

```shell
jest
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
2. Email us at <mailto://support@dock.health>. 

