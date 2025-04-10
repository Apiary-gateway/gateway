import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { Config } from './types';
import defaultConfig from './defaultConfig/config.json';

const s3 = new S3Client({});
const bucket = process.env.CONFIG_BUCKET_NAME!;
let cachedConfig: Config | null = null;

async function streamToString(stream: Readable): Promise<string> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

export async function initConfig(): Promise<void> {
    // if (cachedConfig) return; // commenting this out for now so we can test

    try {
        const key = `configs/config.json`;
        const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const config = JSON.parse(await streamToString(Body as Readable));
        
        if (!isValidConfig(config)) {
            throw new Error('Invalid config structure');
        }

        cachedConfig = config;
    } catch (error) {
        console.warn('Failed to load config from S3, using defaults:', error);
        if (!isValidConfig(defaultConfig)) {
            throw new Error('Invalid default config structure');
        }
        cachedConfig = defaultConfig;
    }
}

function isValidConfig(config: unknown): config is Config {
    console.log(config)
    if (!config || typeof config !== 'object') return false;

    const requiredKeys = ['routing', 'guardrails', 'cache'];
    return requiredKeys.every(key => key in config);
}

export function getConfig(): Config {
    if (!cachedConfig) {
        throw new Error('Config not initialized. You must call initConfig() first.');
    }
    
    return cachedConfig;
}
