// test_processDirectoryPath.js

// Define the function directly
function processDirectoryPath(directoryPath) {
  // Split the directory path into parts (handles both / and \)
  const parts = directoryPath.split(/[/\\]/);
  // Remove empty parts (in case of leading/trailing/multiple slashes)
  return parts.filter(part => part.length > 0);
}

const testCases = [
  {
    key: "windows_drive_path",
    input: "C:\\Users\\John\\Pictures",
    output: ["C:", "Users", "John", "Pictures"]
  },
  {
    key: "unix_path",
    input: "/home/john/photos",
    output: ["home", "john", "photos"]
  },
  {
    key: "mixed_slashes",
    input: "C:/Users/John/Pictures",
    output: ["C:", "Users", "John", "Pictures"]
  },
  {
    key: "trailing_slash",
    input: "C:\\Users\\John\\Pictures\\",
    output: ["C:", "Users", "John", "Pictures"]
  },
  {
    key: "leading_and_trailing_slashes",
    input: "/photos/2024/",
    output: ["photos", "2024"]
  },
  {
    key: "windows_root_only",
    input: "C:\\",
    output: ["C:"]
  },
  {
    key: "unix_root_only",
    input: "/",
    output: []
  },
  {
    key: "empty_string",
    input: "",
    output: []
  },
  {
    key: "multiple_consecutive_slashes",
    input: "C:\\Users\\\\John\\Pictures",
    output: ["C:", "Users", "John", "Pictures"]
  },
  {
    key: "single_folder",
    input: "Pictures",
    output: ["Pictures"]
  }
];

testCases.forEach(({ key, input, output }) => {
  const result = processDirectoryPath(input);
  const passed = JSON.stringify(result) === JSON.stringify(output);
  console.log(`${key}: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed) {
    console.log(`  Input:    ${input}`);
    console.log(`  Expected: ${JSON.stringify(output)}`);
    console.log(`  Got:      ${JSON.stringify(result)}`);
  }
});