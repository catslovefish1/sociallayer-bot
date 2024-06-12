import {
  gql,
  request,
} from "https://deno.land/x/graphql_request@v4.1.0/mod.ts";
import { Event, SolaGroup } from "./types.ts";

export class SocialLayerClient {
  graphUrl = "https://graph.sola.day/v1/graphql";
  async getEventsRaw(
    groupIds: number[],
    startISO: string,
    endISO: string,
    limit: number,
    offset: number,
  ): Promise<{ events: Event[]; hasNextPage: boolean }> {
    // Debugging logs
    console.log(startISO, endISO);

    const query = gql`
      query ($groupIds: [Int!], $limit: Int, $offset: Int, $start: timestamp, $end: timestamp) {
        events(
          where: {
            start_time: { _lte: $end }
            end_time: { _gte: $start }
            group_id: { _in: $groupIds }
            status: { _in: ["open", "new", "normal"] }
          }
          order_by: { start_time: asc }
          limit: $limit
          offset: $offset
        ) {
          id
          title
          content
          cover_url
          tags
          start_time
          end_time
          location
          max_participant
          min_participant
          host_info
          meeting_url
          event_site {
            id
            title
            location
          }
          group_id
          owner {
            username
          }
          notes
          category
          recurring_event {
            id
            interval
            start_time
            end_time
            timezone
          }
          timezone
          geo_lng
          geo_lat
          participants {
            id
            profile {
              username
            }
          }
          external_url
        }
      }
    `;

    const variables = {
      groupIds,
      limit: limit + 1,
      offset,
      start: startISO,
      end: endISO,
    };

    try {
      const response = await request(
        this.graphUrl,
        query,
        variables,
      );
      const events = response.events;
      const hasNextPage = events.length > limit;
      if (hasNextPage) {
        events.pop();
      }
      return { events, hasNextPage };
    } catch (error) {
      console.error("Error fetching events:", error);
      return { events: [], hasNextPage: false };
    }
  }

  async getEvents(
    groupIds: number[],
    startDateInput: string,
    endDateInput: string,
    limit: number,
    offset: number,
  ): Promise<{ events: Event[]; hasNextPage: boolean }> {
    const groupInfo = await this.getGroupTimestamp(groupIds);
    const timezone = groupInfo.length === 0 ? "Asia/Shanghai" : groupInfo[0];

    // Parse date inputs
    const startDate = parseDate(startDateInput, timezone);
    const endDate = parseDate(endDateInput, timezone);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const res = await this.getEventsRaw(
      groupIds,
      startISO,
      endISO,
      limit,
      offset,
    );

    return res;
  }

  async getTodaysEvents(
    groupIds: number[],
    limit: number,
    offset: number,
  ): Promise<{ events: Event[]; hasNextPage: boolean }> {
    const res = await this.getEvents(
      groupIds,
      "today",
      "tomorrow",
      limit,
      offset,
    );
    return res;
  }

  async queryGroup(name: string): Promise<number | undefined> {
    const query = gql`
      query($name: String) {
        groups(where: {username: {_eq: $name}}) {
          id
        }
      }
  `;
    const variables = {
      name,
    };

    try {
      const response = await request<{ groups: { id: number }[] }>(
        this.graphUrl,
        query,
        variables,
      );
      const group = response.groups.pop()?.id;
      return group;
    } catch (error) {
      console.error(`Error query group ${name} with:`, error);
      return undefined;
    }
  }

  async listGroups(): Promise<
    SolaGroup[]
  > {
    const query = gql`{
      groups(where: {events_count: {_gt: 0}}, order_by: {events_count: asc}) {
        username
        id
        events_count
      }
    }`;
    try {
      const response = await request<
        { groups: { username: string; id: number; events_count: number }[] }
      >(
        this.graphUrl,
        query,
      );
      const groups = response.groups.map((value) => {
        const group: SolaGroup = {
          name: value.username,
          events_count: value.events_count,
          id: value.id,
        };
        return group;
      });
      return groups;
    } catch (error) {
      console.error(`Error list group with:`, error);
      return [];
    }
  }

  async getGroupInfos(
    ids: number[],
  ): Promise<{ username: string; timezone: string }[]> {
    const query = gql`
    query($ids:[bigint!]) {
      groups(where: {id: {_in: $ids}}, order_by: {events_count: asc}) {
        username
        timezone
      }
    }
    `;
    const variables = {
      ids,
    };
    try {
      const response = await request<
        { groups: { username: string; timezone: string }[] }
      >(
        this.graphUrl,
        query,
        variables,
      );

      return response.groups;
    } catch (error) {
      console.error(`Error get group names with:`, error);
      return [];
    }
  }

  async getGroupTimestamp(ids: number[]): Promise<string[]> {
    const query = gql`
    query($ids:[bigint!]) {
      groups(where: {id: {_in: $ids}}, order_by: {events_count: asc}) {
        timezone
      }
    }
    `;
    const variables = {
      ids,
    };
    try {
      const response = await request<
        { groups: { timezone: string }[] }
      >(
        this.graphUrl,
        query,
        variables,
      );
      const groups = response.groups.map((value) => {
        return value.timezone;
      });
      return groups;
    } catch (error) {
      console.error(`Error get group timestamps with:`, error);
      return [];
    }
  }
}

// Helper function to parse natural language dates
export function parseDate(input: string, timezone: string): Date {
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

  let date: Date;

  switch (input.toLowerCase()) {
    case "today":
      date = today;
      break;
    case "tomorrow":
      date = new Date(today);
      date.setDate(today.getDate() + 1);
      break;
    default: {
      // Handle specific date inputs
      const parsedDate = new Date(input);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
        // If no year is provided, use the current year
        if (input.match(/^\d{1,2}-\d{1,2}$/)) {
          date.setFullYear(today.getFullYear());
        }
      } else {
        throw new Error("Invalid date input");
      }
    }
  }

  return date;
}
