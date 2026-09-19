import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
export function localDatabase(filename){
 const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON');
 sqlite.exec('CREATE TABLE IF NOT EXISTS __local_migrations(name TEXT PRIMARY KEY)');
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
  if(sqlite.prepare('SELECT name FROM __local_migrations WHERE name=?').get(file))continue;
  sqlite.exec('BEGIN');try{sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));sqlite.prepare('INSERT INTO __local_migrations(name) VALUES(?)').run(file);sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}
 }
 class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Statement(this.sql,args)}async first(){return sqlite.prepare(this.sql).get(...this.args)??null}async run(){return this.execute()}execute(){const p=sqlite.prepare(this.sql);if(p.columns().length)return {success:true,meta:{changes:0},results:p.all(...this.args)};const r=p.run(...this.args);return {success:true,meta:{changes:Number(r.changes)},results:[]}}}
 return {sqlite,DB:{prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}}};
}
