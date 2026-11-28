import {solve} from './solver.js';
self.onmessage=event=>{
  try { const answer=solve(event.data);self.postMessage({ok:true,...answer},[answer.mask.buffer,answer.distance.buffer,answer.tortuosity.buffer]); }
  catch(error){self.postMessage({ok:false,error:error.message});}
};
