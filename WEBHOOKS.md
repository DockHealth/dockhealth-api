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

See `Event Types`, below, for the full list of supported event types.

```json
{
  "url": "https://webhooks.mycompany.com",
  "secret": "30163935c002fc4e1200906c3d30a9c4956b4af9f6dcaef1eb4b1fcb8fba69e7a7acdc491ea5b1f2864ea8c01b01580ef09defc3b11b3f183cb21d236f7f1a6b",
  "enabled": true,
  "events": [
    "CREATE_ORGANIZATION", 
    "UPDATE_ORGANIZATION", 
    "DELETE_ORGANIZATION"
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

NOTE: Timestamps must be formatted as ISO 8601 UTC strings (yyyy-MM-ddTHH:mm:ss.SSSZ).

- `GET /api/v1/developer/event` returns all events for the given developer account matching the provided search criteria.
  - This endpoint requires one of three different query strings:
    - To return a single event: 
      - `/api/v1/developer/event?organization={organizationIdentifier}&event={eventIdentifier}`
    - To return a time-based range of events for a given organization:
        - `/api/v1/developer/event?organization={organizationIdentifier}&startTs={startTs}&endTs={endTs}`
    - To return a time-based range of events for a given organization and event type:
        - `/api/v1/developer/event?organization={organizationIdentifier}&type=ORGANIZATION_UPDATED&startTs={startTs}&endTs={endTs}`
- `GET /api/v1/developer/event/delivery` returns the event delivery history matching the provided search criteria.
  - This endpoint requires one of three different query strings:
    - To return the event delivery history for single event:
        - `/api/v1/developer/event/delivery?organization={organizationIdentifier}&event={eventIdentifier}`
    - To return a time-based range of event delivery history for a given organization:
        - `/api/v1/developer/event?organization={organizationIdentifier}&startTs={startTs}&endTs={endTs}`
    - To return a time-based range of event delivery history for a given organization and event type:
        - `/api/v1/developer/event?organization={organizationIdentifier}&type=ORGANIZATION_UPDATED&startTs={startTs}&endTs={endTs}`

## Event Payload

The webhook event payload contains key information about the event:
  - `eventIdentifier`: The unique identifier of the event. This id can be used to fetch this event on demand from Dock.
  - `organizationIdentifier`: The organization within which the event took place.
  - `userIdentifier`: The user that generated the event.
  - `targetIdentifier`: The identifier of the affected Dock Health object.
  - `targetType`: The type of the affected Dock Health object. The full list is below.
  - `eventType`: The type of the event. The full list is below.
  - `createdAt`: The time at which the event was created, in ISO 8601 UTC format.
  - `audit`: A human-readable audit of the event. It will contain the following attributes:
    - `targetIdentifier`: The identifier of the affected Dock Health object. This will match the `targetIdentifier` of the containing event.
    - `targetType`: The type of the affected Dock Health object. This will match the `targetType` of the containing event.
    - `eventType`: The event type. This will match the `eventType` of the containing event. 
    - `currentState`: A human-readable string describing the state of the object after the event occurred.
    - `previousState`: A human-readable string describing the state of the object before the event occurred.
    - `currentValues`: A set of 0 or more key-value pairs representing the state of the object after the event occurred.
    - `previousValues`: A set of 0 or more key-value pairs representing the state of the object before the event occurred.
    
IMPORTANT: Webhooks are still in active development. The webhook event payload is subject to change.

A sample event looks like this:

```json
{
  "eventIdentifier": "fa65df0a-5585-44c3-9b81-f3f02f713268",
  "organizationIdentifier": "a24c05fd-843c-4fe0-9e8a-399b899ef490",
  "userIdentifier": "7c208219-d55a-4fc8-a720-d2a04a5c360f",
  "targetIdentifier": "572a0cb5-4bbe-11ea-a4e8-124feabd864b",
  "targetType": "ORGANIZATION",
  "eventType": "UPDATE_ORGANIZATION",
  "createdAt": "2022-02-10T23:07:26.094Z",
  "audit": {
    "targetIdentifier": "a24c05fd-843c-4fe0-9e8a-399b899ef490",
    "targetType": "ORGANIZATION",
    "eventType": "UPDATE_ORGANIZATION",
    "currentState": "Organization name was updated to Coyote Health Services.",
    "previousState": "Organization name was Wiley Health Services.",
    "currentValues": {
      "organizationProfileColor": "#ee8b31",
      "organizationCustomerType": "PATIENT",
      "organizationName": "Coyote Health Services",
      "organizationInitials": "CHS",
      "organizationLegalEntityName": "Coyote Health Services"
    },
    "previousValues": {
      "organizationProfileColor": "#ee8b31",
      "organizationCustomerType": "PATIENT",
      "organizationName": "Wiley Health Services",
      "organizationInitials": "WHS",
      "organizationLegalEntityName": "Wiley Health Services"
    }
  }
}
```

## Event Types

```javascript
{
  CREATE_TASK("A new Task was created"),
  CREATE_TASK_FROM_EMAIL("A new Task was created via email"),
  CREATE_RECURRING_TASK("A reccurring Task was created"),
  CREATE_USER("A new User was created"),
  CREATE_PATIENT("A new Patient was created"),
  CREATE_PATIENT_NOTE("A new patient note was created"),
  CREATE_COMMENT("A new Comment was created"),
  CREATE_ATTACHMENT("A new attachment was added"),
  CREATE_ORGANIZATION("A new Organization was created"),
  CREATE_LIST("A new List was created"),
  CREATE_PROTOCOL("A new Protocol was created"),
  CREATE_PROTOCOL_ITEM("A new Protocol Item was created"),
  UPDATE_TASK("Task was updated"),
  UPDATE_TASK_DESCRIPTION("Task description was updated"),
  UPDATE_TASK_PATIENT("Task patient was updated"),
  UPDATE_TASK_PRIORITY("Task priority was updated"),
  UPDATE_TASK_DUE_DATE("Task due date was updated"),
  UPDATE_TASK_STATUS("Task status was updated"),
  UPDATE_TASK_WORKFLOW_STATUS("Task workflow status was updated"),
  UPDATE_TASK_RECURRING_SCHEDULE("Task recurring schedule was updated"),
  UPDATE_USER("User was updated"),
  UPDATE_USER_FIRSTNAME("user first name updated"),
  UPDATE_USER_LASTNAME("user last name updated"),
  UPDATE_USER_SPECIALTY("user specialty updated"),
  UPDATE_USER_SUBSPECIALTY("user subspecialty updated"),
  UPDATE_USER_TITLE("user title updated"),
  UPDATE_USER_CREDENTIALS("user credentials updated"),
  UPDATE_USER_ACCOUNTPHONE("user account phone updated"),
  UPDATE_USER_WORKPHONE("user work phone updated"),
  UPDATE_USER_HOMEPHONE("user home phone updated"),
  UPDATE_USER_FAXNUMBER("user fax number updated"),
  UPDATE_USER_PROFILEPIC("user updated profile picture"),
  UPDATE_USER_NOTIFICATIONPREF_EMAIL("user updated email notification preference"),
  UPDATE_USER_NOTIFICATIONPREF_PUSH("user updated push notification preference"),
  UPDATE_USER_PREF_DISPLAY_COLUMNS("user updated display columns preference"),
  UPDATE_PATIENT("Patient was updated"),
  UPDATE_PATIENT_NOTE("Patient note was updated"),
  UPDATE_COMMENT("Comment was updated"),
  UPDATE_ATTACHMENT("Attachment was updated"),
  UPDATE_ORGANIZATION("Organization was updated"),
  UPDATE_ORGANIZATION_LEGAL_NAME("Organization legal name was updated"),
  UPDATE_ORGANIZATION_SIGNATURE_STATUS("Organization signature status was updated"),
  BAA_SIGNATURE_REQUEST_SENT("BAA signature request sent"),
  UPDATE_LIST("List was updated"),
  UPDATE_LIST_NOTIFICATION_ON("list notifications turned on"),
  UPDATE_LIST_NOTIFICATION_OFF("list notifications turned off"),
  UPDATE_PROTOCOL("Protocol was updated"),
  UPDATE_PROTOCOL_ITEM("Protocol Item was updated"),
  DELETE_TASK("Task was deleted"),
  UNDELETE_TASK("Task was undeleted"),
  DELETE_USER("User was deleted"),
  DELETE_USER_PROFILEPIC("user deleted profile picture"),
  DELETE_PATIENT("Patient was deleted"),
  DELETE_PATIENT_NOTE("Patient note was deleted"),
  DELETE_COMMENT("Comment was deleted"),
  DELETE_ATTACHMENT("Attachment was deleted"),
  DELETE_ORGANIZATION("Organization was deleted"),
  DELETE_LIST("List was deleted"),
  DELETE_PROTOCOL("Protocol was deleted"),
  DELETE_PROTOCOL_ITEM("Protocol Item was deleted"),
  ASSIGN_TASK("A task was assigned"),
  SET_PRIORITY("Task was set as priority"),
  MARK_TASKS_READ("Multiple Tasks marked as 'read'"),
  MARK_READ("Task marked as read"),
  MARK_COMPLETE("Task marked as complete"),
  MARK_INCOMPLETE("Task marked as incomplete"),
  FLAG_AS_UNREAD("User explicitly set Task as 'unread'"),
  UNFLAG_AS_READ("User explicitly set Task as 'read'"),
  ADD_USER_TO_ORGANIZATION("User added to Organization"),
  ADD_USER_TO_LIST("User added to List"),
  ADD_PATIENT_TO_TASK("Add a patient to a Task"),
  REMOVE_USER_FROM_LIST("User removed from List"),
  USER_LEAVES_LIST("User left List"),
  USER_LEAVES_ORGANIZATION("User left Organization"),
  MARK_TASK_UNASSIGNED("Remove assignment of tasks for the user"),
  REMOVE_USER_FROM_ORGANIZATION("User removed from Organization"),
  ADD_EXISTING_TASK_TO_LIST("Existing Task added to List"),
  ADD_NEW_TASK_TO_LIST("New Task added to List"),
  ADD_EXISTING_SUBTASK_TO_ANOTHER_TASK("Sub Task moved to another parent"),
  INVITE_USER_TO_ORGANIZATION("Invite someone to an Organization"),
  INVITE_USER_TO_ORG_AND_LIST("Invite new user to organization and TaskList"),
  ACCEPT_INVITATION_TO_ORGANIZATION("Accept an invitation to Organization"),
  ACCEPT_INVITATION_TO_LIST("Accept an invitation to TaskList"),
  REJECT_INVITATION_TO_LIST("Reject an invitation to TaskList"),
  CANCEL_INVITATION_TO_LIST("Cancel an invitation to TaskList"),
  CHANGE_TASK_PRIORITY("Change the priority of a Task"),
  ADD_DUE_DATE("Add due date to a Task"),
  MARK_TASKS_AS_SEEN("Mark multiple Task as seen for assigner to view"),
  MARK_TASK_AS_SEEN("Task marked as seen"),
  ADD_SUBTASK("Subtask added to a Task"),
  NOTIFIABLE("Event triggers one or more Notifications"),
  ACTIVITY_FEED("Event is logged in the Activity Feed"),
  MAKE_ADMIN_FOR_LIST("Give admin rights for list"),
  REMOVE_ADMIN_FOR_LIST("Remove admin rights for list"),
  MARK_LIST_INVITE_INACTIVE("Mark tasklist invite to inactive"),
  MARK_TASK_INACTIVE("Mark task to inactive"),
  MAKE_ADMIN_FOR_ORGANIZATION("Give admin rights for organization"),
  REMOVE_ADMIN_FOR_ORGANIZATION("Remove admin rights for organization"),
  CANCEL_INVITATION_TO_ORGANIZATION("Cancel an invitation to organization"),
  DUPLICATE_TASK("Duplicate task"),
  TASK_REMINDER_SET("Reminder set for task"),
  TASK_REMINDER_NOTIFICATION_TRIGGERED("Reminder notification triggered for task"),
  TASK_DUE_DATE_REMINDER_TRIGGERED("Due Date reminder triggered for task"),
  SELECT_SUBSCRIPTION("Organization subscription plan was updated"),
  BILLING_DETAILS_UPDATE("Organization billing details were updated"),
  CREATE_LIST_LABEL("A label was created"),
  DELETE_LIST_LABEL("A label was deleted"),
  ADD_TASK_LABEL("Task label was added"),
  EDIT_TASK_LABEL("Task label was edited"),
  REMOVE_TASK_LABEL("Task label was removed"),
  CREATE_TASK_GROUP("A task group was created"),
  EDIT_TASK_GROUP("Task group name was edited"),
  DELETE_TASK_GROUP("Task group was deleted"),
  ADD_TASK_TO_GROUP("Task was added to a group"),
  REMOVE_TASK_FROM_GROUP("Task was removed from a group"),
  CREATE_TASK_TEMPLATE("A task template was created"),
  EDIT_TASK_TEMPLATE("Task template was edited"),
  DELETE_TASK_TEMPLATE("Task template was deleted"),
  ADD_TASK_TO_TEMPLATE("Task was added to a template"),
  REMOVE_TASK_FROM_TEMPLATE("Task was removed from a template"),
  DUPLICATE_TASK_TEMPLATE("Task template was duplicated"),
  CREATE_TASK_BUNDLE("Task bundle created from template"),
  UPDATE_TASK_BUNDLE("Task bundle was updated"),
  DUPLICATE_TASK_BUNDLE("Task bundle duplicated"),
  DELETE_TASK_BUNDLE("Task bundle was deleted"),
  MOVE_TASK_BUNDLE("Task bundle was moved"),
  MENTION_TASK("User is mentioned in a task"),
  MENTION_COMMENT("User is mentioned in a comment")
}
```

## Target Types

```javascript
{
  TASK("This was a Task event"), 
  USER("This was a User event"),
  PATIENT("This was a Patient event"),
  PATIENT_NOTE("This was a Patient Note event"),
  COMMENT("This was a Comment event"),
  ATTACHMENT("This was a Attachment event"),
  ORGANIZATION("This was an Organization event"),
  LIST("This was a TaskList event"),
  LIST_LABEL("This was a List Label event"),
  TASK_LABEL("This was a Task Label event"),
  PROTOCOL("This was a Protocol event"),
  PROTOCOL_ITEM("This was a Protocol Item event"),
  ORG_USER("This was an OrgUser event"),
  LIST_USER("This was a ListUser event"),
  USER_INVITE("This was a UserInvite event"),
  TASK_GROUP("This was a Task Group event"),
  TASK_TEMPLATE("This was a Task Template event"),
  TASK_STATUS("This was a Task Status event"),
  PATIENT_LIST("This was a Patient List event"),
  SHARED_LABEL("This was a Shared Label event"),
  PATIENT_LABEL("This was a Patient Label event"),
  CUSTOM_FIELD("This was a Custom Field event"),
  PATIENT_META_DATA("This was a Patient Meta Data event"),
  TASK_META_DATA("This was a Task Meta Data event"),
  TASK_OUTCOME("This was a Task Outcome event"),
  TRANSACTION_EVENT("Transaction event")
}
```

## Next Steps

The Dock Health API Developer Guide and client examples are available at our public
GitHub API repository (this repo): <https://github.com/DockHealth/dockhealth-api>.

Please see the examples section of this repo for full working examples covering the full webhook lifecycle!

The Dock Health API reference is available in three formats - OpenAPI (yaml), Redoc, and Swagger:

- OpenAPI: <https://partner-api-dev.dockhealth.app/api-docs>
- Redoc: <https://partner-api-dev.dockhealth.app/api-docs/redoc>
- Swagger: <https://partner-api-dev.dockhealth.app/api-docs/swagger>
  
Finally, if you have any trouble, please don't hesitate to reach out for help. Either:

1. Create an issue in this repo: <https://github.com/DockHealth/dockhealth-api/issues>.
2. Email us at <mailto://support@dock.health>. 

Thanks for using Dock Health!


