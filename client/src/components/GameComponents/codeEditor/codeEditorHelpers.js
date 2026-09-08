// Helper to add a space after commas in a string, but not inside string literals
const addSpaceAfterCommas = (str) => {
  let result = "";
  let inString = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += char;

    if (char === '"') {
      // Count consecutive backslashes immediately before this quote.
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && str[j] === "\\") {
        backslashCount++;
        j--;
      }
      // Odd count means the quote is escaped (still inside the string).
      // Even count (with zero) means this is the end of the string literal, so toggle inString.
      if (backslashCount % 2 === 0) {
        inString = !inString;
      }
    }

    if (char === "," && !inString) {
      result += " ";
    }
  }

  return result;
};

// Convert a value to a JSON string, handling cases where the value is already a string or not
export const toJsonString = (value) => {
  let str;
  if (typeof value === "string") {
    try {
      str = JSON.stringify(JSON.parse(value));
    } catch {
      str = JSON.stringify(value);
    }
  } else {
    str = JSON.stringify(value);
  }
  return addSpaceAfterCommas(str);
};

// Helper to strip outer brackets from a string if they exist
export const stripOuterBrackets = (input) => {
  if (input === undefined || input === null) return input;
  const str = toJsonString(input);
  const trimmed = str.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

// Helper to format a value for display in the output console, handling undefined, null, strings, and other types
export const formatValueForDisplay = (value) => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return addSpaceAfterCommas(JSON.stringify(value));
};
