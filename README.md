 # Sola Bot - Subscription and Query Bot for Events

This project is a subscription and query bot designed to provide event information and subscription functionality. The bot supports multiple commands, including listing all event groups, querying event information, and subscribing to event notifications.

## Command List

### List all event groups

Use the `/list` command to list all available event groups:

```
/list
```

This command sends a message with a list of all event group IDs.

### Query event information

Use the `/query` command to retrieve event information for a specific event group:

```
/query <groupID> [start=<date>] [end=<date>] [days=<number>]
```

This command queries and sends event information for a specified event group (Group ID). Optional parameters allow you to filter the results by start date, end date, or the number of days.

### Subscribe to event notifications

Use the `/subs` command to subscribe to event notifications for a specific event group:

```
/subs <groupID> [hour=<number>] [days=<number>]
```

This command subscribes to daily event notifications for a specified event group (Group ID). The bot will send a notification at 7 AM by default, but you can customize the hour and number of days using optional parameters.

### Check subscription status

Use the `/status` command to check the current subscription status:

```
/status
```

This command sends a message with the groups subscribed to, their notification settings (hour and displayed days), or a message indicating that no groups are subscribed.

## Additional Notes

- Ensure that you provide the correct Group ID for each command.
- Each command supports optional parameters. Refer to the command examples and documentation for more information on how to use them.
- Event subscription notifications are sent daily at 7 AM by default, but this can be customized using the `/subs` command.