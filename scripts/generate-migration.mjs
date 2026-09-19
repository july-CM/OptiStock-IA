import fs from 'node:fs/promises';
import {generateSQLiteDrizzleJson,generateSQLiteMigration} from 'drizzle-kit/api';
import * as schema from '../db/schema.ts';
const previous=await generateSQLiteDrizzleJson({});
previous.id='00000000-0000-0000-0000-000000000000';
try{await fs.access('drizzle/0000_optica.sql');throw new Error('The initial migration already exists. Use db:generate for subsequent schema changes.');}catch(error){if(error.code!=='ENOENT')throw error;}
const current=await generateSQLiteDrizzleJson(schema,previous.id);
const sql=await generateSQLiteMigration(previous,current);
await fs.mkdir('drizzle/meta',{recursive:true});
await fs.writeFile('drizzle/0000_optica.sql',sql.join('\n--> statement-breakpoint\n'));
await fs.writeFile('drizzle/meta/0000_snapshot.json',JSON.stringify(current,null,2));
await fs.writeFile('drizzle/meta/_journal.json',JSON.stringify({version:'7',dialect:'sqlite',entries:[{idx:0,version:'6',when:Date.now(),tag:'0000_optica',breakpoints:true}]},null,2));
console.log('Generated initial Drizzle migration.');
