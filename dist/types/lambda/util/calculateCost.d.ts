import { AllModels, SupportedLLMs } from "./types";
export declare function calculateCost(provider: SupportedLLMs, model: AllModels, inputTokens: number, outputTokens: number): number;
