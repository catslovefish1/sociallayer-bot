# Sola Bot

This project is a subscription bot designed to provide event query and subscription functionality.

## Command List

### List all event groups

Use the `list` command to list all event groups:

```
/list
```

This command lists all available event groups (Group IDs).

### Query event information

Use the `query` command to retrieve event information for a specific event group:

```
/query <groupID>
```

This command queries the event information for a specific event group (Group ID).

### Subscribe to event notifications

Use the `subs` command to subscribe to event notifications for a specific event group:

```
/subs <groupID>
```

This command subscribes to event notifications for a specific event group (Group ID). The bot will send a daily notification at 7 AM with the events for the subscribed group.

## Additional Notes

- Ensure that you provide the correct Group ID parameter for each command.
- Each command has specific parameter requirements, refer to the command examples and respective documentation for proper usage.
- Event subscription notifications are sent daily at 7 AM. Make sure the subscribed event group information is accurate.
