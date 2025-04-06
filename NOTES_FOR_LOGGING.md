1. We have to explicitly provide the model and provider name while setting up Athena if we want to run queries based on that.

2. Since `provider` and `model` are partition keys, we can not leave them empty. Here `unknown` is the dummy value.

3. Does it make more sense to save both the logging and message history data in the same dynamo db.

4. There is no typing for `Response`, so we have to determine the `success_reason` in `router.ts`.

5. Ideally we would want to take care of routing history within the logging mechanism.

6. Now, 1 full request-response cycle is a unit, not individual hops.
