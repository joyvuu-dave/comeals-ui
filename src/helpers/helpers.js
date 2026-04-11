import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Cookie from "js-cookie";

dayjs.extend(utc);
dayjs.extend(timezone);

export const TIMEZONE = Cookie.get("timezone") || "America/Los_Angeles";

// dayjs.tz(string, tz) interprets naive strings (no offset) as the
// target timezone — correct.  But for strings with offset info it
// stamps the UTC value as the target timezone instead of converting.
// For those we need dayjs(string).tz(tz).
export function toPacificDayjs(dateString) {
  if (/Z|[+-]\d{2}:?\d{2}\s*$/.test(dateString)) {
    return dayjs(dateString).tz(TIMEZONE);
  }
  return dayjs.tz(dateString, TIMEZONE);
}

export function generateTimes() {
  var times = [];
  var ending = "AM";

  for (var half = 0; half < 2; half++) {
    for (var hour = 0; hour < 12; hour++) {
      for (var min = 0; min < 4; min++) {
        // Start at 8am
        if (half === 0 && hour < 8) {
          continue;
        }

        // End at 10pm
        if (half === 1 && hour === 10 && min === 1) {
          return times;
        }

        var time = {
          display: null,
          value: null,
        };

        var valueHour = hour;

        if (half === 1) {
          ending = "PM";
          valueHour += 12;
        }

        var minutes = `${(min * 15).toString().padStart(2, "0")}`;

        if (hour === 0) {
          time.display = `12:${minutes} ${ending}`;
        } else {
          time.display = `${hour}:${minutes} ${ending}`;
        }

        time.value = `${valueHour.toString().padStart(2, "0")}:${minutes}`;

        times.push(time);
      }
    }
  }

  return times;
}
