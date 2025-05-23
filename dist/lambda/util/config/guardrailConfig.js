"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardrailsConfig = void 0;
exports.guardrailsConfig = {
    enabled: false, // true if guardrails are needed
    threshold: 0.70,
    restrictedWords: [],
    sensitivityLevel: 2,
    resendOnViolation: false,
    blockedContentResponse: 'Content redacted'
};
// validation needed:
// resendOnViolation can't be true if sensitivity level is 0
// sensitivity level can't be 1 if restricted words is empty (or we provide a default set?)
// sensitivity level can't be 2 if guardrailUtterances aren't provided (or we provide a default set?)
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3VhcmRyYWlsQ29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vbGFtYmRhL3V0aWwvY29uZmlnL2d1YXJkcmFpbENvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFYSxRQUFBLGdCQUFnQixHQUFxQjtJQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLGdDQUFnQztJQUNoRCxTQUFTLEVBQUUsSUFBSTtJQUNmLGVBQWUsRUFBRSxFQUFFO0lBQ25CLGdCQUFnQixFQUFFLENBQUM7SUFDbkIsaUJBQWlCLEVBQUUsS0FBSztJQUN4QixzQkFBc0IsRUFBRSxrQkFBa0I7Q0FDN0MsQ0FBQTtBQUVELHFCQUFxQjtBQUNyQiw0REFBNEQ7QUFDNUQsMkZBQTJGO0FBQzNGLHFHQUFxRyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEd1YXJkcmFpbHNDb25maWcgfSBmcm9tIFwiLi4vdHlwZXNcIjtcblxuZXhwb3J0IGNvbnN0IGd1YXJkcmFpbHNDb25maWc6IEd1YXJkcmFpbHNDb25maWcgPSB7XG4gICAgZW5hYmxlZDogZmFsc2UsIC8vIHRydWUgaWYgZ3VhcmRyYWlscyBhcmUgbmVlZGVkXG4gICAgdGhyZXNob2xkOiAwLjcwLFxuICAgIHJlc3RyaWN0ZWRXb3JkczogW10sXG4gICAgc2Vuc2l0aXZpdHlMZXZlbDogMixcbiAgICByZXNlbmRPblZpb2xhdGlvbjogZmFsc2UsIFxuICAgIGJsb2NrZWRDb250ZW50UmVzcG9uc2U6ICdDb250ZW50IHJlZGFjdGVkJ1xufVxuXG4vLyB2YWxpZGF0aW9uIG5lZWRlZDpcbi8vIHJlc2VuZE9uVmlvbGF0aW9uIGNhbid0IGJlIHRydWUgaWYgc2Vuc2l0aXZpdHkgbGV2ZWwgaXMgMFxuLy8gc2Vuc2l0aXZpdHkgbGV2ZWwgY2FuJ3QgYmUgMSBpZiByZXN0cmljdGVkIHdvcmRzIGlzIGVtcHR5IChvciB3ZSBwcm92aWRlIGEgZGVmYXVsdCBzZXQ/KVxuLy8gc2Vuc2l0aXZpdHkgbGV2ZWwgY2FuJ3QgYmUgMiBpZiBndWFyZHJhaWxVdHRlcmFuY2VzIGFyZW4ndCBwcm92aWRlZCAob3Igd2UgcHJvdmlkZSBhIGRlZmF1bHQgc2V0PylcblxuXG5cbiJdfQ==