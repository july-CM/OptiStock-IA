import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {createInventoryHandlers} from '../../../server/inventory';
export const dynamic='force-dynamic';
export async function GET(r:Request){return createInventoryHandlers(env.DB!,await getChatGPTUser()).GET(r)}
export async function POST(r:Request){return createInventoryHandlers(env.DB!,await getChatGPTUser()).POST(r)}
