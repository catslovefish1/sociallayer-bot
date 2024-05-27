import {
  gql,
  request,
} from "https://deno.land/x/graphql_request@v4.1.0/mod.ts";
import { Event, SolaGroup } from "./types.ts";

export class SocialLayerClient {
  graphUrl = "https://graph.sola.day/v1/graphql";

  async getTodaysEvents(
    groupIds: number[],
    limit: number,
    offset: number,
  ): Promise<{ events: Event[]; hasNextPage: boolean }> {
    const today = new Date().toISOString().split("T")[0];
    const nextDay = new Date(new Date().setDate(new Date().getDate() + 1))
      .toISOString()
      .split("T")[0];

    const query = gql`
            query ($groupIds: [Int!], $limit: Int, $offset: Int, $today: timestamp,$nextDay: timestamp) {
              events(
                where: {
                  start_time: { _lte: $nextDay }
                  end_time: { _gte: $today }
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
      today: `${today}T00:00:00.000Z`,
      nextDay: `${nextDay}T00:00:00.000Z`,
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

  async getGroupNames(ids: number[]): Promise<string[]> {
    const query = gql`
    query($ids:[bigint!]) {
      groups(where: {id: {_in: $ids}}, order_by: {events_count: asc}) {
        username
      }
    }
    `;
    const variables = {
      ids,
    };
    try {
      const response = await request<
        { groups: { username: string }[] }
      >(
        this.graphUrl,
        query,
        variables,
      );
      const groups = response.groups.map((value) => {
        return value.username;
      });
      return groups;
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
