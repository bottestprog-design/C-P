class MemoryStorage{constructor(){this.map=new Map()}getItem(key){return this.map.has(String(key))?this.map.get(String(key)):null}setItem(key,value){this.map.set(String(key),String(value))}removeItem(key){this.map.delete(String(key))}clear(){this.map.clear()}key(index){return [...this.map.keys()][index]??null}get length(){return this.map.size}}
const memory=new MemoryStorage();
let cached=null;
function getStorage(){if(cached)return cached;try{const candidate=globalThis.localStorage;const probe='__bunaa_storage_probe__';candidate.setItem(probe,'1');candidate.removeItem(probe);cached=candidate}catch{cached=memory}return cached}
function storageInfo(){const s=getStorage();return {kind:s===memory?'memory':'localStorage',persistent:s!==memory,available:Boolean(s)}}
const storage=getStorage();
exports.getStorage = getStorage;
exports.storageInfo = storageInfo;
exports.storage = storage;
