"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorStatusCode = getErrorStatusCode;
function getErrorStatusCode(error) {
    if (error instanceof Error) {
        const statusCode = error.statusCode;
        if (typeof statusCode === 'number') {
            return statusCode;
        }
    }
    if (error instanceof Object && 'status' in error && typeof error.status === 'number') {
        return error.status;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JIYW5kbGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xhbWJkYS91dGlsL2Vycm9ySGFuZGxpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFhQztBQWJELFNBQWdCLGtCQUFrQixDQUFDLEtBQWM7SUFDN0MsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFLENBQUM7UUFDekIsTUFBTSxVQUFVLEdBQUksS0FBYSxDQUFDLFVBQVUsQ0FBQztRQUM3QyxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sVUFBVSxDQUFDO1FBQ3RCLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxLQUFLLFlBQVksTUFBTSxJQUFJLFFBQVEsSUFBSSxLQUFLLElBQUksT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ25GLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUN4QixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBnZXRFcnJvclN0YXR1c0NvZGUoZXJyb3I6IHVua25vd24pOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSAoZXJyb3IgYXMgYW55KS5zdGF0dXNDb2RlO1xuICAgICAgICBpZiAodHlwZW9mIHN0YXR1c0NvZGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdHVzQ29kZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIE9iamVjdCAmJiAnc3RhdHVzJyBpbiBlcnJvciAmJiB0eXBlb2YgZXJyb3Iuc3RhdHVzID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gZXJyb3Iuc3RhdHVzO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59Il19