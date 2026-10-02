import { google, type calendar_v3 } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const CRED_DIR = process.env.CALENDAR_CREDENTIALS_DIR ?? path.resolve(here, "../credentials");
const TOKEN_PATH = path.join(CRED_DIR, "token.json");

export const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
export const TIMEZONE = process.env.TIMEZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
const CALENDAR_ID = process.env.CALENDAR_ID ?? "primary";

export function createOAuthClient() {
    const raw = JSON.parse(readFileSync(path.join(CRED_DIR, "credentials.json"), "utf8"));
    const { client_id, client_secret } = raw.installed ?? raw.web;
    return new google.auth.OAuth2(client_id, client_secret, "http://localhost:3333/oauth2callback");
}

function getCalendar() {
    if (!existsSync(TOKEN_PATH)) {
        throw new Error("Not authorised yet. Run `npm run auth` inside mcp-calendar.");
    }
    const auth = createOAuthClient();
    auth.setCredentials(JSON.parse(readFileSync(TOKEN_PATH, "utf8")));
    // Lưu access token mới mỗi khi thư viện tự refresh
    auth.on("tokens", (t) => {
        const old = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
        writeFileSync(TOKEN_PATH, JSON.stringify({ ...old, ...t }, null, 2));
    });
    return google.calendar({ version: "v3", auth });
}

const fmt = (e: calendar_v3.Schema$Event) => ({
    id: e.id,
    title: e.summary,
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    location: e.location,
    description: e.description,
});

/** Giờ hiện tại kèm offset múi giờ, để model đổi "ngày mai", "3pm" thành ISO chính xác */
export function nowInfo() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE, hourCycle: "h23", weekday: "long",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const offset = g("timeZoneName").replace("GMT", "") || "+00:00";
    return {
        iso: `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}${offset}`,
        weekday: g("weekday"),
        timezone: TIMEZONE,
    };
}

export async function listEvents(timeMin: string, timeMax: string) {
    const res = await getCalendar().events.list({
        calendarId: CALENDAR_ID, timeMin, timeMax,
        singleEvents: true, orderBy: "startTime", maxResults: 25,
    });
    return (res.data.items ?? []).map(fmt);
}

export async function createEvent(a: {
    title: string; start: string; end: string; description?: string; location?: string;
}) {
    const res = await getCalendar().events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
            summary: a.title, description: a.description, location: a.location,
            start: { dateTime: a.start, timeZone: TIMEZONE },
            end: { dateTime: a.end, timeZone: TIMEZONE },
        },
    });
    return fmt(res.data);
}

export async function updateEvent(
    id: string,
    p: { title?: string; start?: string; end?: string; description?: string; location?: string }
) {
    const body: calendar_v3.Schema$Event = {};
    if (p.title) body.summary = p.title;
    if (p.description) body.description = p.description;
    if (p.location) body.location = p.location;
    if (p.start) body.start = { dateTime: p.start, timeZone: TIMEZONE };
    if (p.end) body.end = { dateTime: p.end, timeZone: TIMEZONE };
    const res = await getCalendar().events.patch({ calendarId: CALENDAR_ID, eventId: id, requestBody: body });
    return fmt(res.data);
}

export async function deleteEvent(id: string) {
    await getCalendar().events.delete({ calendarId: CALENDAR_ID, eventId: id });
}