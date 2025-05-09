"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
exports.requestIsValid = requestIsValid;
const requestSchema_1 = require("./schemas/requestSchema");
function validateRequest(event) {
    const fullParse = requestSchema_1.FullRequestSchema.safeParse(event);
    if (!fullParse.success) {
        console.log('Invalid request format:', fullParse.error);
        throw new Error('Invalid request format');
    }
    let parsedBody;
    try {
        parsedBody = typeof fullParse.data.body === 'string' ? JSON.parse(fullParse.data.body) : fullParse.data.body;
    }
    catch (error) {
        console.log('Error parsing request body:', error);
        throw new Error('Error parsing request body');
    }
    const body = requestSchema_1.RequestBodySchema.safeParse(parsedBody);
    if (!body.success) {
        console.log('Validation error:', body.error.format());
        throw new Error('Request validation error');
    }
    return body.data;
}
function requestIsValid(event) {
    try {
        validateRequest(event);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGVSZXF1ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGFtYmRhL3V0aWwvdmFsaWRhdGVSZXF1ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsMENBd0JDO0FBRUQsd0NBT0M7QUFuQ0QsMkRBQStGO0FBRS9GLFNBQWdCLGVBQWUsQ0FBQyxLQUFjO0lBQzFDLE1BQU0sU0FBUyxHQUFHLGlDQUFpQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hELE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSxVQUFtQixDQUFDO0lBRXhCLElBQUksQ0FBQztRQUNELFVBQVUsR0FBRyxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNqSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxpQ0FBaUIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFckQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNyRCxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztBQUNyQixDQUFDO0FBRUQsU0FBZ0IsY0FBYyxDQUFDLEtBQWM7SUFDekMsSUFBSSxDQUFDO1FBQ0QsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDTCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEZ1bGxSZXF1ZXN0U2NoZW1hLCBSZXF1ZXN0Qm9keVNjaGVtYSwgUmVxdWVzdFBheWxvYWQgfSBmcm9tICcuL3NjaGVtYXMvcmVxdWVzdFNjaGVtYSc7XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVJlcXVlc3QoZXZlbnQ6IHVua25vd24pIHtcbiAgICBjb25zdCBmdWxsUGFyc2UgPSBGdWxsUmVxdWVzdFNjaGVtYS5zYWZlUGFyc2UoZXZlbnQpO1xuICAgIGlmICghZnVsbFBhcnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0ludmFsaWQgcmVxdWVzdCBmb3JtYXQ6JywgZnVsbFBhcnNlLmVycm9yKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlcXVlc3QgZm9ybWF0JylcbiAgICB9XG5cbiAgICBsZXQgcGFyc2VkQm9keTogdW5rbm93bjtcblxuICAgIHRyeSB7XG4gICAgICAgIHBhcnNlZEJvZHkgPSB0eXBlb2YgZnVsbFBhcnNlLmRhdGEuYm9keSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKGZ1bGxQYXJzZS5kYXRhLmJvZHkpIDogZnVsbFBhcnNlLmRhdGEuYm9keTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgcGFyc2luZyByZXF1ZXN0IGJvZHk6JywgZXJyb3IpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yIHBhcnNpbmcgcmVxdWVzdCBib2R5Jyk7XG4gICAgfVxuXG4gICAgY29uc3QgYm9keSA9IFJlcXVlc3RCb2R5U2NoZW1hLnNhZmVQYXJzZShwYXJzZWRCb2R5KTtcblxuICAgIGlmICghYm9keS5zdWNjZXNzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdWYWxpZGF0aW9uIGVycm9yOicsIGJvZHkuZXJyb3IuZm9ybWF0KCkpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVxdWVzdCB2YWxpZGF0aW9uIGVycm9yJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJvZHkuZGF0YTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcXVlc3RJc1ZhbGlkKGV2ZW50OiB1bmtub3duKTogZXZlbnQgaXMgeyBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+OyBib2R5OiBSZXF1ZXN0UGF5bG9hZCB9IHtcbiAgICB0cnkge1xuICAgICAgICB2YWxpZGF0ZVJlcXVlc3QoZXZlbnQpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuIl19