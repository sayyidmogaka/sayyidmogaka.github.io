/* Browser reference solvers. Scientific convention matches rock_tortuosity.core. */
export const MAX_VOXELS = 1_000_000;
export const MAX_FMM_VOXELS = 100_000;

class Heap {
  constructor(){ this.items=[]; }
  push(cost,index){const a=this.items;let k=a.length;a.push([cost,index]);while(k){const p=(k-1)>>1;if(a[p][0]<=cost)break;a[k]=a[p];k=p;}a[k]=[cost,index];}
  pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let k=0;while(k*2+1<a.length){let c=k*2+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=last[0])break;a[k]=a[c];k=c;}a[k]=last;}return first;}
  get length(){return this.items.length;}
}
export function validateShape(shape,max=MAX_VOXELS){
  if(!Array.isArray(shape)||shape.length<1||shape.length>3||shape.some(n=>!Number.isSafeInteger(n)||n<1))throw new Error('Expected a nonempty 1D, 2D or 3D shape.');
  const size=shape.reduce((a,b)=>a*b,1);
  if(!Number.isSafeInteger(size)||size>max)throw new Error(`This browser playground supports at most ${max.toLocaleString()} voxels. Use a crop for larger volumes.`);
  return size;
}
function stridesFor(shape){return shape.map((_,k)=>shape.slice(k+1).reduce((a,b)=>a*b,1));}
function neighbours(p,shape,strides,fn){for(let k=0;k<shape.length;k++){const c=Math.floor(p/strides[k])%shape[k];if(c>0)fn(p-strides[k],k);if(c+1<shape[k])fn(p+strides[k],k);}}
export function segment(values,threshold=null,pore='high'){
  if(pore!=='high'&&pore!=='low')throw new Error('Pore phase must be high or low.');
  if(threshold!==null&&!Number.isFinite(threshold))throw new Error('Threshold must be finite.');
  const mask=new Uint8Array(values.length);
  for(let i=0;i<values.length;i++){const x=values[i];if(!Number.isFinite(x))throw new Error('Input contains a non-finite value.');if(threshold===null&&x!==0&&x!==1)throw new Error('Choose a threshold for grayscale or 0/255 images, for example 127.5.');mask[i]=threshold===null?Number(pore==='high'?x===1:x===0):Number(pore==='high'?x>threshold:x<=threshold);}
  return mask;
}
export function parseNpy(buffer){
  const bytes=new Uint8Array(buffer),view=new DataView(buffer);
  if(bytes.length<10||bytes[0]!==147||String.fromCharCode(...bytes.slice(1,6))!=='NUMPY')throw new Error('Invalid NPY file.');
  const major=bytes[6];if(![1,2,3].includes(major))throw new Error('Unsupported NPY version.');
  const offset=major===1?10:12;if(bytes.length<offset)throw new Error('Truncated NPY header.');
  const length=major===1?view.getUint16(8,true):view.getUint32(8,true);
  if(length>65536||offset+length>bytes.length)throw new Error('Invalid NPY header length.');
  const header=new TextDecoder().decode(bytes.slice(offset,offset+length));
  const dtype=header.match(/['"]descr['"]\s*:\s*['"]([<>=|])([buif])(\d+)['"]/);
  const order=header.match(/['"]fortran_order['"]\s*:\s*(True|False)/);
  const dims=header.match(/['"]shape['"]\s*:\s*\(([^)]*)\)/);
  if(!dtype||!order||!dims)throw new Error('Only real scalar numeric NPY arrays are supported.');
  if(order[1]==='True')throw new Error('Save NPY data in C order before uploading.');
  const shape=dims[1].split(',').map(s=>s.trim()).filter(Boolean).map(s=>/^\d+$/.test(s)?Number(s):NaN);
  const size=validateShape(shape),width=Number(dtype[3]),start=offset+length;
  const readers={b1:'getUint8',u1:'getUint8',i1:'getInt8',u2:'getUint16',i2:'getInt16',u4:'getUint32',i4:'getInt32',f4:'getFloat32',f8:'getFloat64'};
  const reader=readers[dtype[2]+width];if(!reader)throw new Error('Supported NPY types: bool, 8/16/32-bit integers and 32/64-bit floats.');
  if(start+size*width>bytes.length)throw new Error('Truncated NPY data.');
  const values=new Float64Array(size),little=dtype[1]!== '>';
  for(let i=0;i<size;i++)values[i]=view[reader](start+i*width,little);
  return {shape,values};
}
export function decodeRle(data){
  const size=validateShape(data.shape),values=new Uint8Array(size);let at=0,value=data.first;
  if(value!==0&&value!==1)throw new Error('Invalid mask encoding.');
  for(const run of data.runs){if(!Number.isInteger(run)||run<1||at+run>size)throw new Error('Invalid mask run.');values.fill(value,at,at+run);at+=run;value=1-value;}
  if(at!==size)throw new Error('Incomplete mask encoding.');
  return {shape:data.shape,values};
}
export function distanceMap(mask,shape,axis=0,spacing=shape.map(()=>1),method='bfs',reverse=false){
  const strides=stridesFor(shape),d=new Float64Array(mask.length);d.fill(Infinity);
  const seeds=[];
  for(let p=0;p<mask.length;p++)if(mask[p]&&Math.floor(p/strides[axis])%shape[axis]===(reverse?shape[axis]-1:0)){d[p]=0;seeds.push(p);}
  if(method==='bfs'){
    const queue=new Int32Array(mask.length);let head=0,tail=seeds.length;queue.set(seeds);
    while(head<tail){const p=queue[head++];neighbours(p,shape,strides,q=>{if(mask[q]&&d[q]===Infinity){d[q]=d[p]+spacing[0];queue[tail++]=q;}});}
    return d;
  }
  const heap=new Heap();for(const p of seeds)heap.push(0,p);
  const accepted=new Uint8Array(mask.length);
  function trial(p){
    const terms=[];
    for(let k=0;k<shape.length;k++){const c=Math.floor(p/strides[k])%shape[k];let best=Infinity;if(c>0&&accepted[p-strides[k]])best=d[p-strides[k]];if(c+1<shape[k]&&accepted[p+strides[k]])best=Math.min(best,d[p+strides[k]]);if(Number.isFinite(best))terms.push([best,spacing[k]]);}
    terms.sort((a,b)=>a[0]-b[0]);let aa=0,bb=0,cc=0,t=Infinity;
    for(let k=0;k<terms.length;k++){const [v,s]=terms[k],w=1/(s*s);aa+=w;bb+=v*w;cc+=v*v*w;t=(bb+Math.sqrt(Math.max(0,bb*bb-aa*(cc-1))))/aa;if(k+1===terms.length||t<=terms[k+1][0])break;}
    return t;
  }
  while(heap.length){const [cost,p]=heap.pop();if(cost>d[p]||(method==='fmm'&&accepted[p]))continue;if(method==='fmm')accepted[p]=1;
    neighbours(p,shape,strides,(q,k)=>{if(!mask[q]||(method==='fmm'&&accepted[q]))return;const candidate=method==='fmm'?trial(q):cost+spacing[k];if(candidate<d[q]){d[q]=candidate;heap.push(candidate,q);}});
  }
  return d;
}
export function solve({mask,shape,axis=0,spacing=null,method='bfs'}){
  const size=validateShape(shape);
  if(mask.length!==size||Array.from(mask).some(x=>x!==0&&x!==1))throw new Error('Mask values must be 0 or 1 and match the shape.');
  if(!Number.isInteger(axis)||axis<0||axis>=shape.length||shape[axis]<2)throw new Error('Choose an axis with at least two voxels.');
  spacing=spacing??shape.map(()=>1);
  if(spacing.length!==shape.length||spacing.some(s=>!Number.isFinite(s)||s<=0))throw new Error('Provide one finite positive spacing per axis.');
  if(!['bfs','dijkstra','fmm'].includes(method))throw new Error('Unknown browser solver.');
  if(method==='bfs'&&spacing.some(s=>s!==spacing[0]))throw new Error('Use Dijkstra or Fast Marching for anisotropic spacing.');
  if(method==='fmm'&&size>MAX_FMM_VOXELS)throw new Error('Browser Fast Marching is limited to 100000 voxels. Use a smaller crop or the Python workflow.');
  const start=performance.now(),strides=stridesFor(shape),length=(shape[axis]-1)*spacing[axis];
  const distance=distanceMap(mask,shape,axis,spacing,method),backward=distanceMap(mask,shape,axis,spacing,method,true),tau=new Float64Array(size);
  let pores=0,spanning=0,outlets=0,reached=0,min=Infinity,sum=0;
  for(let p=0;p<size;p++){pores+=mask[p];if(Number.isFinite(distance[p])&&Number.isFinite(backward[p]))spanning++;tau[p]=(distance[p]+backward[p])/length;
    if(Math.floor(p/strides[axis])%shape[axis]===shape[axis]-1){if(mask[p])outlets++;if(Number.isFinite(distance[p])){reached++;sum+=distance[p];min=Math.min(min,distance[p]);}}}
  const path=[];
  if(reached&&method!=='fmm'){
    let p=-1;for(let q=0;q<size;q++)if(Math.floor(q/strides[axis])%shape[axis]===shape[axis]-1&&distance[q]===min){p=q;break;}
    while(p>=0){path.push(p);if(distance[p]===0)break;let next=-1;neighbours(p,shape,strides,(q,k)=>{if(distance[q]<distance[p]&&Math.abs(distance[q]+spacing[k]-distance[p])<1e-8*Math.max(1,distance[p])&&(next<0||distance[q]<distance[next]))next=q;});if(next<0)throw new Error('Could not reconstruct a graph predecessor.');p=next;}
    path.reverse();
  }
  return {result:{shape,axis,method,spacing,metric:method==='fmm'?'eikonal_first_order':'face_graph',boundary_convention:'voxel_centres',porosity:pores/size,spanning_porosity:spanning/size,percolates:reached>0,tortuosity_min:reached?min/length:null,tortuosity_mean:reached?sum/reached/length:null,reachable_outlet_fraction:outlets?reached/outlets:0,elapsed_seconds:(performance.now()-start)/1000,engine:'Browser JavaScript · CPU worker'},mask:new Uint8Array(mask),distance,tortuosity:tau,path};
}
export function phantom(name='bend',ndim=2,size=48,seed=42){
  const shape=Array(ndim).fill(size),mask=new Uint8Array(validateShape(shape)),strides=stridesFor(shape);
  let state=seed>>>0;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
  for(let p=0;p<mask.length;p++){const c=shape.map((n,k)=>Math.floor(p/strides[k])%n);if(name==='random')mask[p]=Number(random()<.68);else if(ndim===1)mask[p]=Number(name!=='blocked'||c[0]!==Math.floor(size/2));else{const centre=name==='straight'?Math.floor(size/2):(c[0]<size/3?Math.floor(size*.25):c[0]<2*size/3?Math.floor(size*.5):Math.floor(size*.75));const width=Math.ceil(size*.15);mask[p]=Number(Math.abs(c[1]-centre)<=width&&(ndim!==3||Math.abs(c[2]-Math.floor(size/2))<=width));if(name==='blocked'&&c[0]===Math.floor(size/2))mask[p]=0;}}
  return {shape,values:mask};
}
