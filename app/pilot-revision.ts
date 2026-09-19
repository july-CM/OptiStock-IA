import type {PilotEvent} from './pilot-types';
export function revision(events:PilotEvent[]){return `${events.length}:${events.filter(e=>e.annulled_at).length}`}
