import { SolaGroup } from "./types.ts";
import {
  Event,
  EventMessage,
  // EventSites,
  HostInfo,
  // RecurringEvent,
} from "./types.ts";
import { markdownv2 as format } from "https://deno.land/x/telegram_format@v3.1.0/mod.ts";

export function formatEvent(event: Event): EventMessage {
  const {
    title,
    start_time,
    end_time,
    location,
    meeting_url,
    host_info,
    timezone,
  } = event;

  const formattedTitle = format.bold(format.escape(title));
  const formattedTime = formatTime(
    start_time,
    end_time,
    timezone,
  );

  const formattedLocation = location || "";
  const formattedMeetingUrl = meeting_url || "";

  const hostInfo = parseHostInfo(host_info);
  const formattedHostInfo = formatHostInfo(hostInfo);

  const caption = [
    `${formattedTitle}`,
    `${format.bold("Time:")} ${format.escape(formattedTime)}`,
    formattedLocation
      ? `${format.bold("Location:")} ${format.escape(formattedLocation)}`
      : "",
    formattedMeetingUrl
      ? `${format.bold("Meeting URL:")} ${format.escape(formattedMeetingUrl)}`
      : "",
    formattedHostInfo,
  ].filter((line) => line.trim()).join("\n");

  return {
    image: null,
    caption,
  };
}

function formatTime(
  startTime: string,
  endTime: string,
  timezone: string | null,
) {
  const timeZone = timezone || "UTC";
  const baseOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone,
  };
  const now = new Date();
  const start = new Date(`${startTime}Z`);
  const end = new Date(`${endTime}Z`);
  const startTz = new Date(
    start.toLocaleString("en-US", { timeZone }),
  );
  const endTz = new Date(end.toLocaleString("en-US", { timeZone }));

  const startOptions: Intl.DateTimeFormatOptions = {
    ...baseOptions,
    year: startTz.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  };

  const endOptions: Intl.DateTimeFormatOptions = {
    ...baseOptions,
    year: endTz.getFullYear() !== now.getFullYear() ||
        endTz.getFullYear() !== startTz.getFullYear()
      ? "numeric"
      : undefined,
    timeZoneName: "short",
  };

  return `${start.toLocaleString("en-US", startOptions)} - ${
    end.toLocaleString("en-US", endOptions)
  }`;
}
function parseHostInfo(hostInfoString: string | null): HostInfo | null {
  try {
    return hostInfoString ? JSON.parse(hostInfoString) : null;
  } catch (error) {
    console.error("Error parsing host_info:", error);
    return null;
  }
}

function formatHostInfo(hostInfo: HostInfo | null): string {
  if (!hostInfo) {
    return "";
  }

  const allHosts = [];

  if (hostInfo.speaker && Array.isArray(hostInfo.speaker)) {
    allHosts.push(...hostInfo.speaker.map((speaker) => speaker.username));
  }

  if (hostInfo.co_host && Array.isArray(hostInfo.co_host)) {
    allHosts.push(...hostInfo.co_host.map((coHost) => coHost.username));
  }

  if (hostInfo.group_host && hostInfo.group_host.username) {
    const groupHostUsername = `${hostInfo.group_host.username}${
      hostInfo.group_host.creator ? " (Creator)" : ""
    }`;
    allHosts.push(groupHostUsername);
  }

  return allHosts.length > 0
    ? `${format.bold("Hosts:")} ${format.escape(allHosts.join(", "))}`
    : "";
}

export function getGroupIdCounts(groupIds: number[]): Map<number, number> {
  const groupIdCounts = new Map<number, number>();

  for (const groupId of groupIds) {
    const count = groupIdCounts.get(groupId) || 0;
    groupIdCounts.set(groupId, count + 1);
  }

  return groupIdCounts;
}

export function formatGroups(
  groups: SolaGroup[],
): string {
  let formattedOutput = "<b>Groups:</b>\n\n";

  for (const group of groups) {
    formattedOutput += `📦 <b>Group ID:</b> ${group.id}`;
    if (group.name) {
      formattedOutput += ` | <b>Group Name:</b> ${group.name}`;
    }
    formattedOutput += ` | <b>Count:</b> ${group.events_count}\n`;
  }

  return formattedOutput;
}
export function parseGroupId(
  rawGroupId: string | undefined,
): number | undefined {
  if (rawGroupId) {
    try {
      return parseInt(rawGroupId);
    } catch (error) {
      console.error(`❌ Invalid group ID: ${error}`);
    }
  }
  return undefined;
}
