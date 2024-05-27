export interface HostInfo {
  speaker: { username: string }[];
  co_host: { username: string }[];
  group_host: {
    id: number;
    creator: boolean;
    username: string;
    nickname: string | null;
    image_url: string | null;
  } | null;
}

export interface RecurringEvent {
  interval: string;
  start_time: string;
  end_time: string;
}

export interface EventSites {
  id: number | null;
  title: string | null;
  location: string | null;
  about: string | null;
  group_id: number | null;
  owner_id: number | null;
  created_at: string | null;
  formatted_address: null | string;
  geo_lat: null | string;
  geo_lng: null | string;
}

export interface Participants {
  id: number;
  check_time: string | null;
  created_at: string;
  message: string | null;
  profile: ProfileSimple;
  profile_id: number;
  status: string;
  event: Event;
  role: string;
  event_id: number;
}

export interface ProfileSimple {
  username: string;
}

export interface Event {
  id: number;
  title: string;
  content: string;
  cover_url: string | null;
  tags: null | string[];
  start_time: string;
  end_time: string;
  location: null | string;
  max_participant: null | number;
  min_participant: null | number;
  host_info: null | string;
  meeting_url: null | string;
  event_site: null | EventSites;
  event_type: "event" | "checklog";
  group_id?: null | number;
  owner: ProfileSimple;
  notes: string | null;
  category: null | string;
  recurring_event: null | {
    id: number;
    interval: string;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  timezone: null | string;
  geo_lng: null | string;
  geo_lat: null | string;
  participants: null | Participants[];
  external_url: null | string;
}

export interface EventMessage {
  image: string | null;
  caption: string;
}

export interface SolaGroup {
  name: string | null;
  id: number;
  events_count: number;
}
