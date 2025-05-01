import { LinearService } from './linear-service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Runs a demonstration CRUD cycle using the LinearService.
 */
async function runCycle() {
    console.log("--- Starting Linear Service Test Cycle ---");

    // Get API Key from environment
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
        console.error('Error: LINEAR_API_KEY not found in .env file.');
        return; // Exit if no API key
    }

    // Instantiate the service with the API key
    const linearService = new LinearService(apiKey);

    // Check if client initialized successfully
    if (!linearService.getClient()) {
        console.error("Exiting: Linear client failed to initialize in service.");
        return;
    }

    // Connect and fetch viewer info
    await linearService.connectAndFetchViewer();

    // Fetch initial issues (optional demonstration)
    // await linearService.fetchMyIssues();

    // --- Setup for Create/Update --- 
    let teamId: string | undefined;
    let targetStateId: string | undefined;
    let states: any[] = []; // Using any for simplicity, replace with WorkflowState if imported

    // Fetch teams
    const teams = await linearService.fetchTeams();
    if (teams.length > 0) {
        teamId = teams[0].id;
        console.log(`Using Team ID: ${teamId} (${teams[0].name})`);

        // Fetch states for the selected team
        states = await linearService.fetchTeamStates(teamId);
        if (states.length > 0) {
            const todoState = states.find(s => s.name.toLowerCase() === 'todo');
            const backlogState = states.find(s => s.name.toLowerCase() === 'backlog');
            targetStateId = todoState?.id ?? backlogState?.id ?? states[0].id;
            console.log(`Selected State ID for creation: ${targetStateId}`);
        } else {
            console.warn("Could not fetch states for the team. Issue will be created with default state.");
        }
    } else {
        console.error("No teams found. Cannot proceed without a team.");
        return; // Exit if no teams found
    }

    // Define desired priority
    const targetPriority = 2; // 2 = High priority
    console.log(`Selected Priority for creation: ${targetPriority} (High)`);

    // --- CRUD Cycle Demonstration --- 
    let issueIdToProcess: string | undefined;

    // 1. Create Issue
    const createPayload = {
        title: "Test Issue via Service Test Cycle", // Updated title
        teamId: teamId, // teamId is guaranteed to be set if we reached here
        description: "Created via the separate test cycle script.",
        priority: targetPriority,
        stateId: targetStateId,
    };
    const createdIssue = await linearService.createIssue(createPayload);

    if (createdIssue) {
        issueIdToProcess = createdIssue.id;

        // 2. Read (Fetch By ID) - Optional verification
        // await linearService.fetchIssueById(issueIdToProcess);

        // 3. Update Issue (Title and Status)
        const updatedTitle = "Updated Title and Status via Service Test Cycle";
        const inProgressState = states.find(s => s.name.toLowerCase() === 'in progress');
        const targetUpdateStateId = inProgressState?.id;

        // Explicitly define the type for updatePayload to include optional stateId
        const updatePayload: { title: string; stateId?: string } = { title: updatedTitle };
        if (targetUpdateStateId) {
            updatePayload.stateId = targetUpdateStateId;
            console.log(`\nPreparing to update issue ${issueIdToProcess} to State='In Progress' (ID: ${targetUpdateStateId})...`);
        } else {
            console.log("\nCould not find 'In Progress' state, only updating title...");
        }
        await linearService.updateIssue(issueIdToProcess, updatePayload);

         // Optional: Fetch again to verify update immediately
         // console.log("Fetching issue after update to verify changes...");
         // await linearService.fetchIssueById(issueIdToProcess);

    } // End of: if (createdIssue)

    // 4. Archive (Delete) Issue
    if (issueIdToProcess) {
        const archived = await linearService.archiveIssue(issueIdToProcess);
        if (archived) {
            // Optional: Verify archival by trying to fetch and checking archivedAt
            console.log("\nVerifying archival by fetching and checking archivedAt...");
            const fetchedAgain = await linearService.fetchIssueById(issueIdToProcess);
            if (fetchedAgain) {
                if (fetchedAgain.archivedAt) {
                    console.log(`Verification SUCCESS: Issue ${fetchedAgain.identifier} was successfully archived at ${fetchedAgain.archivedAt}.`);
                } else {
                    console.error(`Verification FAILED: Issue ${fetchedAgain.identifier} fetched, but not archived.`);
                }
            } else {
                 console.log(`Verification NOTE: Issue ${issueIdToProcess} could not be fetched after archival attempt.`);
            }
        }
    } else {
        console.log("\nIssue creation failed or ID not stored, skipping archive step.");
    }

    console.log("\n--- Linear Service Test Cycle Finished ---");
}

// Execute the cycle
runCycle().catch(console.error);
