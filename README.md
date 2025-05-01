# Windsurf Linear Library

A Node.js library providing a simple interface to interact with the Linear API using the `@linear/sdk`.

This library is primarily used by the [Windsurf Linear VS Code Extension](https://github.com/jawnty/windsurf-linear-extension).

## Installation

```bash
npm install @linear/sdk
# Note: This library is not published to npm yet.
# If using independently, you would typically link it locally or publish it.
```

## Usage

```javascript
import { LinearClient } from '@linear/sdk';
import { fetchMyIssues, createIssue, fetchTeams, fetchIssueById, updateIssue, archiveIssue } from 'windsurf-linear'; // Adjust path if needed

// Initialize the official Linear SDK client
const linearClient = new LinearClient({ apiKey: 'YOUR_LINEAR_API_KEY' });

async function main() {
  try {
    // Fetch teams
    const teams = await fetchTeams(linearClient);
    console.log('Teams:', teams);
    const teamId = teams[0]?.id; // Get the ID of the first team

    if (teamId) {
      // Create an issue
      const newIssue = await createIssue(linearClient, 'New Task from Library', teamId, 'This is the description.');
      console.log('Created Issue:', newIssue);
      const issueId = newIssue.id;

      // Fetch your issues
      const myIssues = await fetchMyIssues(linearClient);
      console.log('My Issues:', myIssues);

      // Fetch the specific issue
      const fetchedIssue = await fetchIssueById(linearClient, issueId);
      console.log('Fetched Issue by ID:', fetchedIssue);

      // Update the issue
      const updatedIssue = await updateIssue(linearClient, issueId, { title: 'Updated Task Title' });
      console.log('Updated Issue:', updatedIssue);

      // Archive the issue
      const archivedIssue = await archiveIssue(linearClient, issueId);
      console.log('Archived Issue:', archivedIssue);

      // Verify archival (optional)
      const checkArchived = await fetchIssueById(linearClient, issueId);
       console.log('Is Archived:', !!checkArchived?.archivedAt);

    } else {
      console.log('No teams found to create an issue in.');
    }

  } catch (error) {
    console.error('Linear API Error:', error);
  }
}

main();
```

## API

This library exports the following asynchronous functions, which wrap the `@linear/sdk`:

*   `fetchTeams(client: LinearClient): Promise<Team[]>` - Fetches the user's teams.
*   `fetchMyIssues(client: LinearClient): Promise<Issue[]>` - Fetches issues assigned to the user.
*   `fetchIssueById(client: LinearClient, issueId: string): Promise<Issue | undefined>` - Fetches a specific issue by its ID (works even if archived).
*   `createIssue(client: LinearClient, title: string, teamId: string, description?: string): Promise<Issue>` - Creates a new issue.
*   `updateIssue(client: LinearClient, issueId: string, payload: IssueUpdateInput): Promise<Issue>` - Updates an existing issue. Requires the issue ID and a payload object (e.g., `{ title: 'New Title', description: 'New Desc', ... }`).
*   `archiveIssue(client: LinearClient, issueId: string): Promise<ArchivePayload>` - Archives (soft-deletes) an issue.

*(Where `LinearClient`, `Team`, `Issue`, `IssueUpdateInput`, `ArchivePayload` are types from `@linear/sdk`)*

## License

[MIT](LICENSE)
