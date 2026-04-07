import { describe, it, expect } from "vitest";
import { generateTimes } from "../../../src/helpers/helpers.js";

describe("generateTimes", () => {
  // generateTimes produces time picker options for reservation/event forms

  it("starts at 8:00 AM", () => {
    const times = generateTimes();
    expect(times[0]).toEqual({ display: "8:00 AM", value: "08:00" });
  });

  it("ends at 10:00 PM", () => {
    const times = generateTimes();
    const last = times[times.length - 1];
    expect(last).toEqual({ display: "10:00 PM", value: "22:00" });
  });

  it("displays noon correctly as 12:00 PM (not 0:00 PM)", () => {
    // hour=0 in the PM half should display as 12, not 0
    const times = generateTimes();
    const noon = times.find((t) => t.value === "12:00");
    expect(noon).toBeDefined();
    expect(noon.display).toBe("12:00 PM");
  });

  it("uses 24-hour format for values", () => {
    const times = generateTimes();
    const onePM = times.find((t) => t.display === "1:00 PM");
    expect(onePM).toBeDefined();
    expect(onePM.value).toBe("13:00");
  });

  it("generates only 15-minute intervals", () => {
    const times = generateTimes();
    times.forEach((t) => {
      const minutes = t.value.split(":")[1];
      expect(["00", "15", "30", "45"]).toContain(minutes);
    });
  });

  it("generates 57 time slots (8:00 AM to 10:00 PM in 15-min intervals)", () => {
    // 8am-11:45am = 16 slots, 12:00pm-10:00pm = 41 slots
    const times = generateTimes();
    expect(times).toHaveLength(57);
  });

  it("transitions correctly from 11:45 AM to 12:00 PM", () => {
    // Boundary: AM/PM crossover at noon
    const times = generateTimes();
    const lastAM = times.find((t) => t.value === "11:45");
    const firstPM = times.find((t) => t.value === "12:00");
    expect(lastAM.display).toBe("11:45 AM");
    expect(firstPM.display).toBe("12:00 PM");
  });

  it("pads single-digit minutes with leading zero in value", () => {
    // value should be "08:00" not "8:00"
    const times = generateTimes();
    const eight = times.find((t) => t.display === "8:00 AM");
    expect(eight.value).toBe("08:00");
  });
});
