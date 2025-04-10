import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getEmbedding, indexVector } from "./vectorSearch";
import { retryWithBackoff } from "./retryWithBackoff";
import { GuardrailS3Params } from "./types";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function embedAndIndexGuardrails({ bucket, key }: GuardrailS3Params) {

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  const streamToString = (stream: any): Promise<string> =>
    new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      stream.on("error", reject);
    });

  const json = await streamToString(response.Body);
  const utterances: string[] = JSON.parse(json);

  for (const utterance of utterances) {
    const embedding = await getEmbedding(utterance);
    await indexVector("guardrails-index", {
      text: utterance,
      embedding,
    });
  }

  console.log(`✅ Indexed ${utterances.length} guardrail utterances`);
}
