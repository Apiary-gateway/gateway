import { GuardrailResult } from "./types";
import { RoutingLog } from './routingLog';
export declare function checkGuardrailsLevelTwo(prompt: string, llmResponse: string, log: RoutingLog): Promise<GuardrailResult>;
export declare function checkGuardrails(prompt: string, llmResponse: string, log: RoutingLog): Promise<GuardrailResult>;
