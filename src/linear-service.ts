// src/linear-service.ts
import { 
  LinearClient, 
  Issue, 
  Team, 
  LinearDocument, 
  WorkflowState, 
  User, 
  LinearFetch,
  IssuePayload 
} from '@linear/sdk';
import path from 'path';

// --- Interfaces for Payloads (Defined locally) ---
interface ICreateIssuePayload {
  title: string;
  teamId: string;
  description?: string;
  priority?: number; 
  stateId?: string;
}

interface IUpdateIssuePayload {
  title?: string;
  description?: string;
  priority?: number;
  stateId?: string;
}

// Determine the root path based on the environment (e.g., development vs. packaged extension)
const rootPath = path.resolve(__dirname, '..');

// --- Linear Service Class ---
export class LinearService {
  private client: LinearClient;

  constructor(apiKey: string) {
    // Check if the API key is provided via argument
    if (!apiKey) {
      throw new Error('Linear API Key not provided to LinearService constructor.');
    }
    // Initialize the client with the provided apiKey
    this.client = new LinearClient({ apiKey });
    console.log("Linear client initialized in service.");
  }

  getClient(): LinearClient {
      return this.client;
  }

  async connectAndFetchViewer(): Promise<User | null> {
    console.log("\nConnecting to Linear...");
    try {
      const me = await this.client.viewer;
      console.log(`Successfully connected to Linear as: ${me.name} (${me.email})`);
      return me;
    } catch (error) {
      console.error("Failed to connect to Linear or fetch viewer:", error);
      return null;
    }
  }

  async fetchMyIssues(): Promise<Issue[]> {
    console.log('\nFetching issues assigned to me...');
    const me = await this.client.viewer;
    if (!me) { 
      throw new Error('Could not authenticate user.');
    }

    const issues = await this.client.issues({
      filter: {
        assignee: { id: { eq: me.id } },
        archivedAt: { null: true } 
      },
      orderBy: LinearDocument.PaginationOrderBy.CreatedAt, 
      first: 50 
    });

    console.log(`Found ${issues.nodes.length} issues.`);
    for (const issue of issues.nodes) {
      try {
        const state = await issue.state;
        console.log(` - [${issue.identifier}] ${issue.title} (State: ${state?.name ?? 'N/A'})`);
      } catch (error) {
        console.log(` - [${issue.identifier}] ${issue.title} (State: Error fetching state)`);
        console.error(`Error fetching state for issue ${issue.id}:`, error);
      }
    }
    return issues.nodes; 
  }

  async fetchTeams(): Promise<Team[]> {
    console.log("\nFetching your teams...");
    try {
      const teamsResult = await this.client.teams();
      if (teamsResult.nodes.length) {
        console.log(`Found ${teamsResult.nodes.length} teams:`);
        teamsResult.nodes.forEach(team => {
          console.log(`- ${team.name} (ID: ${team.id}, Key: ${team.key})`);
        });
        return teamsResult.nodes;
      } else {
        console.log("No teams found for this user.");
        return [];
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      return [];
    }
  }

  async fetchTeamStates(teamId: string): Promise<WorkflowState[]> {
    console.log(`\nFetching states for team ID ${teamId}...`);
    try {
      const statesResult = await this.client.workflowStates({
        filter: { team: { id: { eq: teamId } } }
      });
      if (statesResult.nodes.length) {
        console.log(`Found ${statesResult.nodes.length} states:`);
        statesResult.nodes.forEach(state => {
          console.log(`- ${state.name} (ID: ${state.id}, Type: ${state.type})`);
        });
        return statesResult.nodes;
      } else {
        console.log("No states found for this team.");
        return [];
      }
    } catch (error) {
      console.error(`Error fetching states for team ${teamId}:`, error);
      return [];
    }
  }

  async fetchWorkflowStates(teamId: string): Promise<WorkflowState[]> {
    console.log(`\nFetching workflow states for team ${teamId}...`);
    try {
      const team = await this.client.team(teamId);
      if (!team) {
        console.error(`Team with ID ${teamId} not found.`);
        return [];
      }
      const states = await team.states(); 
      if (states.nodes.length) {
        console.log(`Found ${states.nodes.length} states for team ${team.name}`);
        return states.nodes;
      } else {
        console.log(`No workflow states found for team ${team.name}.`);
        return [];
      }
    } catch (error) {
      console.error(`Failed to fetch workflow states for team ${teamId}:`, error);
      return [];
    }
  }

  async createIssue(payload: ICreateIssuePayload): Promise<Issue> { 
    console.log(`\nCreating issue "${payload.title}" in team ${payload.teamId}...`);
     if (payload.priority !== undefined) console.log(` - Setting priority: ${payload.priority}`); 
     if (payload.stateId) console.log(` - Setting state ID: ${payload.stateId}`);
    try {
      const result = await this.client.createIssue(payload);
      if (result.success && result.issue) {
        const createdIssue = await result.issue; 
        if (!createdIssue) { 
             throw new Error('Issue creation reported success, but no issue data was returned.');
        }
        console.log(`Successfully created issue: ${createdIssue.identifier} (${createdIssue.id})`);
        return createdIssue;
      } else {
        console.error("Failed to create issue: API reported !success or no issue returned.");
        throw new Error(`Failed to create issue: API reported !success or no issue returned.`);
      }
    } catch (error) {
      console.error('Error in createIssue:', error);
      throw error; // Re-throw caught error
    }
  }

  async fetchIssueById(issueId: string): Promise<Issue | null> {
    console.log(`\nFetching issue by ID: ${issueId}...`);
    try {
      const issue = await this.client.issue(issueId); 
      console.log(`Fetched issue: ${issue?.identifier}`);
      return issue || null;
    } catch (error) {
      console.error(`Error fetching issue ${issueId}:`, error);
      return null;
    }
  }

  async updateIssue(issueId: string, payload: IUpdateIssuePayload): Promise<Issue> { 
    console.log(`\nUpdating issue ${issueId}...`);
    if (payload.title) console.log(` - Setting title: ${payload.title}`);
    if (payload.description) console.log(' - Setting description...');
    if (payload.priority !== undefined) console.log(` - Setting priority: ${payload.priority}`);
    if (payload.stateId) console.log(` - Setting state ID: ${payload.stateId}`);

    try {
      const result: IssuePayload = await this.client.updateIssue(issueId, payload);
      if (result.success && result.issue) {
        const updatedIssue = await result.issue; 
        if (!updatedIssue) { 
             throw new Error('Issue update reported success, but no issue data was returned.');
        }
        console.log(`Successfully updated issue: ${updatedIssue.identifier} (${updatedIssue.id})`);
        return updatedIssue;
      } else {
        console.error("Failed to update issue: API reported !success or no issue returned.");
        throw new Error(`Failed to update issue: API reported !success or no issue returned.`);
      }
    } catch (error) {
      console.error('Error in updateIssue:', error);
      throw error; // Re-throw caught error
    }
  }

   async archiveIssue(issueId: string): Promise<boolean> {
     console.log(`\nAttempting to archive issue ${issueId}...`);
     try {
      const result = await this.client.archiveIssue(issueId);
      if (result.success) {
        console.log(`Successfully archived issue ${issueId}.`);
        return true;
      } else {
        console.error(`Failed to archive issue ${issueId}. API reported failure.`);
        return false;
      }
    } catch (error) {
      console.error(`Error archiving issue ${issueId}:`, error);
      return false;
    }
  }
}
