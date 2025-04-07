import { GuardrailsConfig } from "../types";

export const guardrailsConfig: GuardrailsConfig = {
    threshold: 0.70,
    restrictedWords: [],
    sensitivityLevel: 0,
    resendOnViolation: false, 
    blockedContentResponse: 'Content redacted'
}

// validation needed:
// resendOnViolation can't be true if sensitivity level is 0
// sensitivity level can't be 1 if restricted words is empty (or we provide a default set?)
// sensitivity level can't be 2 if guardrailUtterances aren't provided (or we provide a default set?)



