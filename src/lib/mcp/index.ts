import { defineMcp, auth } from "@lovable.dev/mcp-js";
import getRunnerProfile from "./tools/get-runner-profile";
import listActivities from "./tools/list-activities";
import getTrainingSummary from "./tools/get-training-summary";
import listPersonalRecords from "./tools/list-personal-records";
import listGoals from "./tools/list-goals";
import createGoal from "./tools/create-goal";
import logActivity from "./tools/log-activity";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "pace-intelligent-runner",
  title: "PACE: Intelligent Runner",
  version: "0.1.0",
  instructions:
    "Tools for PACE, an intelligent running platform. Read the signed-in runner's profile, activities, training summaries, personal records and goals, create new goals, and log manual sessions. All data is scoped to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getRunnerProfile,
    listActivities,
    getTrainingSummary,
    listPersonalRecords,
    listGoals,
    createGoal,
    logActivity,
  ] as unknown as Parameters<typeof defineMcp>[0]["tools"],
});
