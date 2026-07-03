// Imports
import db from "../../db.js";

// Helper to build C++ argument declarations
export const buildCppArgDeclarations = (paramTypes) => {
  return paramTypes
    .map(
      (type, index) => `${type} arg${index} = args[${index}].get<${type}>();`,
    )
    .join("\n");
};

// Helper to build C++ argument names
export const buildCppArgNames = (paramTypes) => {
  return paramTypes.map((_, index) => `arg${index}`).join(", ");
};

// Get Param types
export const getParamTypes = async (functionName, language) => {
  // Only for C++
  if (language !== "cpp") {
    return [];
  }
  const paramTypes = await db.query(
    "SELECT param_types FROM starter_code WHERE function_name = $1 AND language = $2",
    [functionName, language],
  );
  return paramTypes.rows[0]?.param_types || [];
};
