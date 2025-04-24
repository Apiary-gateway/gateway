"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitGuardrails = exports.getGuardrails = void 0;
const axios_1 = __importDefault(require("axios"));
const logs_service_1 = require("./logs.service");
const zod_1 = require("zod");
const GetGuardrailsSchema = zod_1.z.array(zod_1.z.coerce.string());
const getGuardrails = async () => {
    try {
        const { data } = await axios_1.default.get(`${logs_service_1.API_BASE_URL + 'guardrails'}`);
        return GetGuardrailsSchema.parse(data);
    }
    catch (error) {
        console.error('Error fetching guardrails:', error);
        alert('Error fetching guardrails');
        return [];
    }
};
exports.getGuardrails = getGuardrails;
const submitGuardrails = async (guardrails) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return guardrails;
};
exports.submitGuardrails = submitGuardrails;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3VhcmRyYWlscy5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vZnJvbnRlbmQtdWkvc3JjL3NlcnZpY2VzL2d1YXJkcmFpbHMuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrREFBMEI7QUFDMUIsaURBQThDO0FBQzlDLDZCQUF3QjtBQUV4QixNQUFNLG1CQUFtQixHQUFHLE9BQUMsQ0FBQyxLQUFLLENBQUMsT0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRWhELE1BQU0sYUFBYSxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQ3RDLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQUMsR0FBRywyQkFBWSxHQUFHLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDbkUsT0FBTyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25ELEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztBQUNILENBQUMsQ0FBQztBQVRXLFFBQUEsYUFBYSxpQkFTeEI7QUFFSyxNQUFNLGdCQUFnQixHQUFHLEtBQUssRUFBRSxVQUFvQixFQUFFLEVBQUU7SUFDN0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzFELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUhXLFFBQUEsZ0JBQWdCLG9CQUczQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XG5pbXBvcnQgeyBBUElfQkFTRV9VUkwgfSBmcm9tICcuL2xvZ3Muc2VydmljZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcblxuY29uc3QgR2V0R3VhcmRyYWlsc1NjaGVtYSA9IHouYXJyYXkoei5jb2VyY2Uuc3RyaW5nKCkpO1xuXG5leHBvcnQgY29uc3QgZ2V0R3VhcmRyYWlscyA9IGFzeW5jICgpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IGF4aW9zLmdldChgJHtBUElfQkFTRV9VUkwgKyAnZ3VhcmRyYWlscyd9YCk7XG4gICAgcmV0dXJuIEdldEd1YXJkcmFpbHNTY2hlbWEucGFyc2UoZGF0YSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgZ3VhcmRyYWlsczonLCBlcnJvcik7XG4gICAgYWxlcnQoJ0Vycm9yIGZldGNoaW5nIGd1YXJkcmFpbHMnKTtcbiAgICByZXR1cm4gW107XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBzdWJtaXRHdWFyZHJhaWxzID0gYXN5bmMgKGd1YXJkcmFpbHM6IHN0cmluZ1tdKSA9PiB7XG4gIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbiAgcmV0dXJuIGd1YXJkcmFpbHM7XG59O1xuIl19