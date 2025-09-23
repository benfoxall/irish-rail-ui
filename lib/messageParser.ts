export function parsePublicMessage(message: string) {
  const lines = message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Train code is always first line
  const train = lines[0];

  // Route and time is usually second line, but sometimes time is in third line (pre-departure)
  let routeLine = lines[1] || "";
  let route = routeLine;

  // If pre-departure, routeLine may not have time, so check third line for time
  if (/Expected Departure/.test(lines[2] || "")) {
    // e.g. "Howth to Bray" + "Expected Departure 09:52"
    const match = /Expected Departure (\d{2}:\d{2})/.exec(lines[2]);
    if (match) {
      route = `${match[1]} - ${routeLine}`;
    }
  } else {
    // Remove late info from route, including cases with no space before parenthesis
    route = route.replace(/\s*\(?-?\d+\s+mins?\s+late\)?/, "");
  }

  // Third line is the status
  const statusLine = lines[2] || "";
  let type = "";
  let station = "";

  if (/Departed/.test(statusLine)) {
    type = "departed";
    // Departed <station> next stop ...
    const match = /Departed ([^ ]+)/.exec(statusLine);
    if (match) station = match[1];
  } else if (/Arrived/.test(statusLine)) {
    type = "arrived";
    // Arrived <station> next stop ...
    const match = /Arrived ([^ ]+(?: [^ ]+)?)/.exec(statusLine);
    if (match) {
      // If next stop is present, only take up to 'next stop'
      const arrMatch = /Arrived (.+?) next stop/.exec(statusLine);
      station = arrMatch ? arrMatch[1] : match[1];
    }
  } else if (/TERMINATED/.test(statusLine)) {
    type = "terminated";
    // TERMINATED <station> at <time>
    const termMatch = /TERMINATED (.+?) at/.exec(statusLine);
    if (termMatch) {
      station = termMatch[1];
    }
  } else if (/Expected Departure/.test(statusLine)) {
    type = "waiting";
    // For waiting, station is the origin (before ' to ')
    station = routeLine.split(" to ")[0];
  }

  return {
    train,
    route,
    type,
    station,
  };
}
