import type { Route } from "./+types/home";
import { CampaignOrchestrator } from "../components/campaign-orchestrator/campaign-orchestrator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Campaign Orchestrator" },
    {
      name: "description",
      content:
        "Stream AI-generated campaign recommendations across channels with live data signals.",
    },
  ];
}

export default function Home() {
  return <CampaignOrchestrator />;
}
