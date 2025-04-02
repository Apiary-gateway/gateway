import { RoutingEvent, RoutingLog as RoutingLogType } from "./types";

export class RoutingLog {
    private log: RoutingLogType;

    constructor() {
        this.log = {
            timestamp: Date.now().toString(),
            events: [],
        };
    }

    getLog() {
        return this.log;
    }

    conditionMatched(condition: string) {
        this.add({ type: 'condition_match', condition });
    }

    routedToLoadBalance() {
        this.add({ type: 'routed_to_load_balance' });
    }

    modelSelected(provider: string, model: string) {
        this.add({ type: 'model_selected', provider, model });
    }

    routedToFallback(newProvider: string, newModel: string) {
        this.add({ type: 'routed_to_fallback', newProvider, newModel });
    }

    routedToDefault(provider: string, model: string) {
        this.add({ type: 'routed_to_default', provider, model });
    }

    routedToSpecified(provider: string, model: string) {
        this.add({ type: 'routed_to_specified', provider, model });
    }

    routingError(error: string, statusCode?: number) {
        this.add({ type: 'routing_error', error, statusCode });
    }

    private add(event: RoutingEvent) {
        this.log.events.push(event);
    }
}