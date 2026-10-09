const DB_NAME='bunaa-studio-assets-v30';
const DB_VERSION=1;
class AssetBlobStore{
  constructor(){this.dbPromise=null}
  open(){
    if(!globalThis.indexedDB)return Promise.resolve(null);
    if(this.dbPromise)return this.dbPromise;
    this.dbPromise=new Promise(resolve=>{
      try{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null)}catch{resolve(null)}
    });
    return this.dbPromise;
  }
  async available(){return Boolean(await this.open())}
  async put(id,blob,meta={}){const db=await this.open();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({id:String(id),blob,type:blob?.type||meta.type||'application/octet-stream',name:meta.name||'',updatedAt:Date.now()});tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
  async get(id){const db=await this.open();if(!db)return null;return new Promise(resolve=>{try{const req=db.transaction('assets','readonly').objectStore('assets').get(String(id));req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null)}catch{resolve(null)}})}
  async delete(id){const db=await this.open();if(!db)return false;return new Promise(resolve=>{try{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').delete(String(id));tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
}
const assetBlobStore=new AssetBlobStore();
exports.AssetBlobStore=AssetBlobStore;
exports.assetBlobStore=assetBlobStore;
