import { describe, it, expect } from "vitest";
import calendarFixture from "../fixtures/calendar.json";

describe("Calendar event URL / modal routing compatibility", () => {
  // renderModal in calendar/show.jsx accepts both hyphenated and underscored resource names.
  const VALID_MODAL_NAMES = [
    "guest-room-reservations",
    "guest_room_reservations",
    "common-house-reservations",
    "common_house_reservations",
    "events",
  ];

  // URL format: /calendar/:type/:date/:resource/:view/:id
  // The resource segment (index 4) must match a case in renderModal's switch
  function extractResource(url) {
    return url.split("/")[4];
  }

  it("common_house_reservations fixture URL matches modal routing", () => {
    const event = calendarFixture.common_house_reservations[0];
    expect(VALID_MODAL_NAMES).toContain(extractResource(event.url));
  });

  it("guest_room_reservations fixture URL matches modal routing", () => {
    const event = calendarFixture.guest_room_reservations[0];
    expect(VALID_MODAL_NAMES).toContain(extractResource(event.url));
  });

  it("events fixture URL matches modal routing", () => {
    const event = calendarFixture.events[0];
    expect(extractResource(event.url)).toBe("events");
  });
});
