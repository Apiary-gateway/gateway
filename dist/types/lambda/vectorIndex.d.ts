import { CdkCustomResourceEvent, Context } from "aws-lambda";
export declare const handler: (event: CdkCustomResourceEvent, context: Context) => Promise<{
    PhysicalResourceId: string;
}>;
