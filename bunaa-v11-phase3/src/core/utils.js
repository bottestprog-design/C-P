export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const uid=(prefix='n')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
export const deepClone=o=>{if(o===undefined)return undefined;if(typeof structuredClone==='function')return structuredClone(o);return JSON.parse(JSON.stringify(o))};
export const slugify=(text='')=>{const value=String(text).normalize('NFKC').trim().toLowerCase();const slug=value.replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');return slug||`page-${Math.random().toString(36).slice(2,6)}`};
export function safeUrl(url=''){const s=String(url??'').trim();if(!s||s==='#')return '#';if(/^(javascript|vbscript|data|file):/i.test(s))return '#';if(/^(https?:|mailto:|tel:)/i.test(s))return s;if(/^[/#.][^\s]*$/.test(s)||/^[^:\s]+(?:[/#][^\s]*)?$/.test(s))return s;return '#';}
export const escapeHtml=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export const escapeAttr=escapeHtml;
export function debounce(fn,wait=250){let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}}
export function throttle(fn,wait=80){let last=0,t;return (...a)=>{const now=Date.now();if(now-last>=wait){last=now;fn(...a)}else{clearTimeout(t);t=setTimeout(()=>{last=Date.now();fn(...a)},wait-now)}}}
export const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
export const downloadBlob=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
export const downloadText=(text,name,type='text/plain;charset=utf-8')=>downloadBlob(new Blob([text],{type}),name);
export const dataUrlFromFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
export const formatBytes=b=>b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(2)} MB`;
export function deepMerge(base,patch){if(!isObject(base)||!isObject(patch))return deepClone(patch);const out=deepClone(base);for(const [k,v] of Object.entries(patch))out[k]=isObject(v)&&isObject(out[k])?deepMerge(out[k],v):deepClone(v);return out}
export const textToLines=t=>String(t||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
