import { getEmbedding, searchKNN } from "./vectorSearch";
import { guardrailsConfig } from "./config/guardrailConfig";
import { split as splitSentences } from 'sentence-splitter';
import { GuardrailResult } from "./types";
import { RoutingLog } from './routingLog';

const guardrailsIndex = process.env.OPENSEARCH_GUARDRAILS_INDEX;

function checkGuardrailsLevelOne(llmResponse: string, log: RoutingLog): GuardrailResult {
    for (const word of guardrailsConfig.restrictedWords) {
        if (llmResponse.toLowerCase().includes(word.toLowerCase())) {
            log.guardrailHit('one', word)
            return { isBlocked: true, match: word };
        }
    }
    return { isBlocked: false };
}

export async function checkGuardrailsLevelTwo(prompt: string, llmResponse: string, log: RoutingLog): Promise<GuardrailResult> {
    const chunks = chunkTextBySentences(prompt + '. ' + llmResponse, 3);

    if (!guardrailsIndex) {
        throw new Error("OPENSEARCH_GUARDRAILS_INDEX is not set");
    }

    for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk);
        const matches = await searchKNN(guardrailsIndex, embedding, 1);
        const topMatch = matches[0];
        const similarity = topMatch._score ?? 0;

        if (similarity > guardrailsConfig.threshold) {
            log.guardrailHit('two', topMatch._source.text)
            return { isBlocked: true, match: topMatch._source.text };
        }
    }

    return { isBlocked: false };
}

export async function checkGuardrails(prompt: string, llmResponse: string, log: RoutingLog): Promise<GuardrailResult> {
    try {
        if (guardrailsConfig.sensitivityLevel === 0) {
            return { isBlocked: false };
        }

        const levelOne = checkGuardrailsLevelOne(llmResponse, log);

        if (levelOne.isBlocked) {
            return levelOne;
        }
    
        if (guardrailsConfig.sensitivityLevel === 2) {
            const levelTwo = await checkGuardrailsLevelTwo(prompt, llmResponse, log);
            return levelTwo;
        }
    
        return { isBlocked: false }
    } catch (error) {
        console.log('error in checkGuardrails: ', error);
        return { isBlocked: false };
    }

}

function chunkTextBySentences(text: string, sentencesPerChunk: number): string[] {
    const sentences = splitSentences(text)
        .filter(node => node.type === 'Sentence')
        .map(node => node.raw.trim())
        .filter(Boolean);

    const chunks: string[] = [];

    for (let i = 0; i < sentences.length; i += sentencesPerChunk - 1) {
        const chunk = sentences.slice(i, i + sentencesPerChunk).join(' ');
        chunks.push(chunk);
        if (chunk) chunks.push(chunk);
    }

    return chunks;
}

export async function guardrailRouting(llmResponse: string) {

}