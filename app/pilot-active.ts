import type {PilotData} from './pilot-types';
export function activePilotShift(data:PilotData){if(data.currentShiftId!==undefined)return data.shifts.find(s=>s.id===data.currentShiftId);return data.shifts.find(s=>!data.archivedShiftIds.includes(s.id)&&!data.receipts.some(r=>r.shift_id===s.id));}
