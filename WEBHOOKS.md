# Dock Health Webhooks API

Webhooks are a mechanism to notify developers of changes to their data. It involves the following steps:

- Dock Health defines various event types available for notifications. For example:	  
  - Organization Created, Updated, Deleted  
  - User Created, Updated, Deleted 
  - Patient Created, Updated, Deleted 
  - List Created, Updated, Deleted 
  - Group Created, Updated, Deleted 
  - Task Created, Updated, Deleted 
  - Etc.
- Developers register webhooks with Dock Health. A webhook is a public-facing URL under the control of the developer
  to which Dock Health can POST a notification each time one of the above events occurs. 
- Dock Health delivers event notifications via the registered webhooks in a timely fashion.
- Dock Health allows developers to fetch these event notifications on demand.

In addition to the basic requirements, the webhooks system also needs to deal with authentication, error handling, 
event ordering, and duplicates.

## Webhook Management

Developers register and manage webhooks via the Dock Health API as follows:

### `POST /api/v1/developer/webhook` 

Creates a webhook.

This endpoint requires the `dockhealth/system.developer.write` scope.

Payload: 

- URL: The full URL to the webhook.
  - Required.
  - Must be unique across ALL webhooks. 
  - This will serve as the webhook’s external identifier. 
  - Must be https, be accessible over the public internet at the time the POST is made, 
    and pass an authentication challenge (see the Authentication section, below).
- Secret: A secret that Dock will return with each webhook notification. 
  - Required.
  - Must be unique across ALL webhooks. Recommend using a SHA-512 hash of a randomly-generated value.
  - Will be returned by Dock Health in all events sent to the webhook. This helps ensure that the notification 
    actually comes from Dock Health. 
- Enabled: A flag to instruct Dock to call the webhook.
  - Not required. False by default.
  - Only enabled webhooks will be called with notifications.
  - This does NOT apply to the authentication challenge – the webhook MUST be able
    to respond to the challenge at the time the webhook is created!
- Events: An array of event names identifying the events to send to the webhook. 
  - Not required. Empty by default.
    
Example:

```json
{
  "url": "https://webhooks.mycompany.com",
  "secret": "30163935c002fc4e1200906c3d30a9c4956b4af9f6dcaef1eb4b1fcb8fba69e7a7acdc491ea5b1f2864ea8c01b01580ef09defc3b11b3f183cb21d236f7f1a6b",
  "enabled": true,
  "events": [
    "ORGANIZATION_CREATED", 
    "ORGANIZATION_UPDATED", 
    "ORGANIZATION_DELETED",
    "USER_CREATED",
    "USER_UPDATED",
    "USER_DELETED",
    "PATIENT_CREATED",
    "PATIENT_UPDATED",
    "PATIENT_DELETED",
    "PATIENT_NOTE_CREATED",
    "PATIENT_NOTE_UPDATED",
    "PATIENT_NOTE_DELETED",
    "TASK_LIST_CREATED",
    "TASK_LIST_UPDATED",
    "TASK_LIST_DELETED",
    "TASK_GROUP_CREATED",
    "TASK_GROUP_UPDATED",
    "TASK_GROUP_DELETED",
    "TASK_CREATED",
    "TASK_UPDATED",
    "TASK_DELETED"
  ]
}
```

IMPORTANT! All endpoints will be created in an unverified state!
See the `Authentication` section for more information about endpoint verification.

NOTE: Dock Health will allow more than one webhook to receive a given event. All verified, enabled, webhooks configured
to receive a given event will receive that event. 

### `PUT /api/v1/developer/webhook/{id}`

Updates the webhook for the specified id.

This endpoint requires the `dockhealth/system.developer.write` scope.

All values required to create the webhook MUST ALSO BE SET HERE!

All updates, including enabling/disabling a webhook, will trigger a re-verification of the endpoint!

### `DELETE /api/v1/developer/webhook/{id}` 

Deletes the webhook for the specified id.

This endpoint requires the `dockhealth/system.developer.write` scope.

### `GET /api/v1/developer/webhook` 

Returns all webhooks for a given developer account.

This endpoint requires the `dockhealth/system.developer.read` scope.

###	`GET /api/v1/developer/webhook/{id}` 

Returns the webhook for the specified id.

This endpoint requires the `dockhealth/system.developer.read` scope.

## Webhook Authentication

Webhook authentication happens in two ways:

1. Dock authenticates the developer during web hook creation:
   - The developer sends a `POST` request to create the webhook or a `PUT` to update the webhook. 
   - The request contains a `secret` with which Dock will sign each notification to the webhook. 
   - Dock sends a `GET` request to the webhook with a message parameter set to some random string. 
     - Example: <https://services.mycompany.com/webhooks?message=a4c51484-9318-11eb-a8b3-0242ac130003>
   - The developer creates an HMAC hex digest signature of a SHA-256 hash of the message. 
     - The signature is created with a key set to the secret that was sent in the initial POST or PUT request, 
       and a message set to the message sent by Dock to the webhook. 
     - The webhook responds with a `200` and a response body containing a single attribute, digest, set to the digest.
       - Example: `{ “digest”: “eyJraWQiOiJyYTAraGdJUlhDTEZJNlNKY0ladjNMdmVITUJoTDhGTGhO“ }`
  - Dock attempts to verify the signature. 
    - If it is correct, Dock sets the endpoint `verified` flag to true. Notifications will be delivered to this endpoint. 
      If it is not correct, Dock sets the endpoint `verified` flag to false. Notifications will not be delivered to this endpoint.

2. The developer verifies notifications sent by Dock:
   - Each notification sent by Dock will include a header, `X-Dock-Signature-256`, and is constructed as follows:
   - The header contains a timestamp and one or more signatures. 
   - The timestamp is prefixed by `t=`, and each signature is prefixed by a scheme. 
   - Schemes start with `v`, followed by an integer. Currently, the only valid signature scheme is `v1`. 
   - The hash signature begins after the scheme, `v1=`, and is an HMAC hex digest signature 
     of a SHA-256 hash of the entire notification payload (JSON body), using the webhook’s `secret` as the key. 
   - The developer must split the header on the commas (,) and verify the signature by constructing 
     their own signature following the same rules and confirming that it matches the signature sent by Dock Health.
   - IMPORTANT: HTTP headers are case-insensitive! 
     You should do a case-insensitive match when looking for the Dock (and any other) headers!
     
Example (real header will not include linebreaks):

```html
X-Dock-Signature-256:
t=1492774577,
v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```  

To verify the signature, follow these steps:

- Create a SHA-256 hash of the entire notification payload (JSON body), using the webhook's `secret` as the key.
- Create an HMAC hex digest of the hash.
- Compare the digest against the digest sent by Dock Health in the header of the notification (`v1=<digest>`).
- IMPORTANT: HTTP headers are case-insensitive!
  You should do a case-insensitive match when looking for the Dock (and any other) headers!

## Event Ordering

Dock Health does not guarantee in-order event notification delivery, though every effort will be taken to “usually, mostly” 
achieve it. If exact event ordering is needed, please rely upon the timestamp on each event to properly order 
events as they are received. 

## De-Duplication

To prevent event duplication, each event sent by Dock will contain a unique `eventIdentifier`. 

The same event will be sent to multiple webhooks IF multiple webhooks are configured to receive that event. 

## Fetching Events on Demand

Developers may also pull events from Dock as needed. This will allow them to fetch any events 
that were not pushed due to unverified or disabled webhooks, or to verify the events that were pushed, 
or for any other reason. 

All events fetched from Dock will contain the same `eventIdentifier` that was attached to the events 
when pushed to the developer's webhooks. This `eventIdentifier` can be used to de-duplicate any events that 
were pushed via webhooks AND fetched on demand.

Developers can pull events via the following Dock Health API endpoints:

These requests all require the `dockhealth/system.developer.read` scope.

- `GET /api/v1/developer/event` returns all events for the given developer account matching the provided search criteria.
  - This endpoint requires one of two different query strings:
    - To return a single event: 
      - `/api/v1/developer/event?organization={organizationIdentifier}&event={eventIdentifier}`
    - To return a time-based range of events for a given organization:
        - `/api/v1/developer/event?organization={organizationIdentifier}&startTs={startTs}&endTs={endTs}`
        - Timestamps must be in this format and are assumed to be UTC: `yyyy-MM-dd HH:mm:ss`
- `GET /api/v1/developer/event/delivery` returns the event delivery history matching the provided search criteria.
    - This endpoint requires one of two different query strings:
        - To return the event delivery history for single event:
            - `/api/v1/developer/event/delivery?organization={organizationIdentifier}&event={eventIdentifier}`
        - To return a time-based range of event delivery history for a given organization:
            - `/api/v1/developer/event?organization={organizationIdentifier}&startTs={startTs}&endTs={endTs}`
            - Timestamps must be in this format and are assumed to be UTC: `yyyy-MM-dd HH:mm:ss`

## Next Steps

The Dock Health API Developer Guide and client examples are available at our public
GitHub API repository (this repo): <https://github.com/DockHealth/dockhealth-api>.

Please see the examples section of this repo for full working examples covering the full webhook lifecycle!

The Dock Health API reference is available in three formats - OpenAPI (yaml), Redoc, and Swagger:

- DEVELOPMENT:
  - OpenAPI: <https://partner-api-dev.dockhealth.app/api-docs>
  - Redoc: <https://partner-api-dev.dockhealth.app/api-docs/redoc>
  - Swagger: <https://partner-api-dev.dockhealth.app/api-docs/swagger-ui.html>
- PRODUCTION:
  - OpenAPI: <https://partner-api.dock.health/api-docs>
  - Redoc: <https://partner-api.dock.health/api-docs/redoc>
  - Swagger: <https://partner-api.dock.health/api-docs/swagger-ui.html>
  
Finally, if you have any trouble, please don't hesitate to reach out for help. Either:

1. Create an issue in this repo: <https://github.com/DockHealth/dockhealth-api/issues>.
2. Email us at <mailto://support@dock.health>. 

Thanks for using Dock Health!


