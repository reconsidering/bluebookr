import {createQueue} from './concurrency.js';
export function createHostScheduler({spacing=300,now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const hosts=new Map();
 return async(host,task)=>{if(!hosts.has(host))hosts.set(host,{queue:createQueue(1,24),count:0,last:-Infinity});const state=hosts.get(host);state.count++;
 try{return await state.queue(async()=>{const delay=spacing-(now()-state.last);if(delay>0)await wait(delay);state.last=now();return task();});}finally{if(--state.count===0){const timer=setTimeout(()=>{if(state.count===0&&hosts.get(host)===state)hosts.delete(host);},spacing);timer.unref?.();}}
 };
}
export function memoizeImport(load,{ttl=600000,maxEntries=100,now=Date.now}={}){
 const cache=new Map(),pending=new Map();
 return async key=>{
 const hit=cache.get(key);if(hit&&hit.expires>now())return {...structuredClone(hit.result),retrieval:{cached:true,fetchedAt:hit.fetchedAt}};
 if(hit)cache.delete(key);
 if(pending.has(key))return structuredClone(await pending.get(key));
 const promise=(async()=>{const result=await load(key);const fetchedAt=new Date(now()).toISOString();const output={...result,retrieval:{cached:false,fetchedAt}};
 if(!result.requiresReview){cache.set(key,{result:structuredClone(output),fetchedAt,expires:now()+ttl});while(cache.size>maxEntries)cache.delete(cache.keys().next().value);}return output;})();
 pending.set(key,promise);try{return structuredClone(await promise);}finally{pending.delete(key);}
 };
}
