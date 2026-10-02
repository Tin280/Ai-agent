import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { nowInfo, listEvents, createEvent, updateEvent, deleteEvent } from "./calendar.js";

const server = new McpServer({ name: "calendar-server", version: "1.0.0" });

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });
const fail = (msg: string) => ({ content: [{ type: "text" as const, text: msg }], isError: true });
const run = async (fn: () => Promise<unknown>) => {
    try { return ok(await fn()); }
    catch (e) { console.error(e); return fail(`Calendar error: ${(e as Error).message}`); }
};

const ISO = "ISO 8601 with timezone offset, e.g. 2026-10-03T14:00:00+02:00";

server.registerTool(
    "get_current_datetime",
    { description: "Get the current date, time, weekday and timezone. Call this first whenever the user says 'today', 'tomorrow', 'next week' or gives a time without a date.", inputSchema: {} },
    () => run(async () => nowInfo())
);

server.registerTool(
    "list_events",
    {
        description: "List calendar events between two times. Returns event ids needed for update and delete.",
        inputSchema: {
            from: z.string().describe(`Start of range. ${ISO}`),
            to: z.string().describe(`End of range. ${ISO}`),
        },
    },
    ({ from, to }) => run(() => listEvents(from, to))
);

server.registerTool(
    "create_event",
    {
        description: "Create a new calendar event.",
        inputSchema: {
            title: z.string(),
            start: z.string().describe(ISO),
            end: z.string().describe(ISO),
            description: z.string().optional(),
            location: z.string().optional(),
        },
    },
    (args) => run(() => createEvent(args))
);

server.registerTool(
    "update_event",
    {
        description:
            "Change an existing event (title, time, location). Find the event id with list_events first. " +
            "Set confirmed=true ONLY after the user has explicitly approved the exact change.",
        inputSchema: {
            event_id: z.string(),
            title: z.string().optional(),
            start: z.string().optional().describe(ISO),
            end: z.string().optional().describe(ISO),
            description: z.string().optional(),
            location: z.string().optional(),
            confirmed: z.boolean().describe("true only after the user approved this change"),
        },
    },
    ({ event_id, confirmed, ...patch }) =>
        confirmed
            ? run(() => updateEvent(event_id, patch))
            : Promise.resolve(fail("Not changed yet. Tell the user exactly what will change and ask them to confirm, then call again with confirmed=true."))
);

server.registerTool(
    "delete_event",
    {
        description:
            "Permanently delete an event. Find the event id with list_events first. " +
            "Set confirmed=true ONLY after the user has explicitly approved deleting this event.",
        inputSchema: { event_id: z.string(), confirmed: z.boolean() },
    },
    ({ event_id, confirmed }) =>
        confirmed
            ? run(async () => { await deleteEvent(event_id); return { deleted: event_id }; })
            : Promise.resolve(fail("Not deleted yet. Ask the user to confirm which event to delete, then call again with confirmed=true."))
);

await server.connect(new StdioServerTransport());