import { routingConfig } from "./routingConfigData";
import { guardrailsUtterances, guardrailsThreshold } from "./guardrailsConfig";

export const config = {
  routing: routingConfig,
  guardrails: {
    threshold: guardrailsThreshold,
    utterances: guardrailsUtterances,
  }
};