/**
 * Server-only database simulation module.
 * Any attempt by a client component to import this file directly
 * will trigger compiler error FS1004 during Vite build!
 */

export interface DatabaseRecord {
  id: string;
  name: string;
  role: string;
  isPrivileged: boolean;
  secretHash: string;
}

const mockDatabase: DatabaseRecord[] = [
  { id: "usr_1", name: "Alice Administrator", role: "admin", isPrivileged: true, secretHash: "sha256_mock_hash_89712a" },
  { id: "usr_2", name: "Bob Developer", role: "engineer", isPrivileged: false, secretHash: "sha256_mock_hash_3341b5" },
  { id: "usr_3", name: "Charlie Designer", role: "designer", isPrivileged: false, secretHash: "sha256_mock_hash_9981f2" },
];

export async function queryPrivilegedRecords(): Promise<Omit<DatabaseRecord, "secretHash">[]> {
  // Simulate database latency
  await new Promise((resolve) => setTimeout(resolve, 20));

  // Strips server secrets before returning to loader
  return mockDatabase.map(({ secretHash, ...publicFields }) => publicFields);
}
