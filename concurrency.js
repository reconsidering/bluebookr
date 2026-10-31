export function createQueue(concurrency,maxPending=24){
 let active=0;const pending=[];
 const pump=()=>{while(active<concurrency&&pending.length){active++;const {task,resolve,reject}=pending.shift();Promise.resolve().then(task).then(resolve,reject).finally(()=>{active--;pump();});}};
 return task=>new Promise((resolve,reject)=>{if(active>=concurrency&&pending.length>=maxPending){reject(Error('Import queue is full. Try again shortly.'));return;}pending.push({task,resolve,reject});pump();});
}
export async function boundedMap(items,concurrency,fn){const results=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(next<items.length){const i=next++;try{results[i]={value:await fn(items[i],i)};}catch(error){results[i]={error};}}}));return results;}
