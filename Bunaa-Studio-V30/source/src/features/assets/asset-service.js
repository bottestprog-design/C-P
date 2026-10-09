const {addAsset,updateAsset,searchAssets,normalizeAssets,findAsset,assetForNodeType,assetKind,extensionForType} = __require("src/core/assets.js");
const {dataUrlFromFile,uid} = __require("src/core/utils.js");
const {findNodeGlobal,walk} = __require("src/core/model.js");
const {assetBlobStore} = __require("src/features/assets/blob-store.js");
const MAX_ASSET_BYTES=75*1024*1024;
class AssetService {
  constructor(store){this.store=store;this.blobStore=assetBlobStore;this.uploading=0}
  list({query='',folder='',tag='',kind=''}={}){return searchAssets(this.store.project.assets,query,folder,tag,kind)}
  folders(){return [...new Set(normalizeAssets(this.store.project.assets).map(asset=>asset.folder))].sort()}
  tags(){return [...new Set(normalizeAssets(this.store.project.assets).flatMap(asset=>asset.tags))].sort()}
  get(id){return findAsset(this.store.project,id)}
  add(raw){return addAsset(this.store,raw)}
  update(id,patch){return updateAsset(this.store,id,patch)}
  remove(id){
    const asset=this.get(id);if(!asset)return false;
    const changed=this.store.transact('حذف وسيط وإلغاء ربطه',project=>{
      project.assets=(project.assets||[]).filter(item=>item.id!==id);
      const detach=nodes=>walk(nodes,node=>{
        if(node.props?.assetId===id){delete node.props.assetId;delete node.props.filename;for(const key of ['src','url'])if(String(node.props?.[key]||'')===String(asset.data||asset.url||''))delete node.props[key]}
        if(Array.isArray(node.props?.assetIds))node.props.assetIds=node.props.assetIds.filter(assetId=>assetId!==id);
      });
      for(const page of project.pages||[])detach(page.nodes);
      for(const symbol of project.symbols?.definitions||[])if(symbol.root)detach([symbol.root]);
    });
    if(changed)this._deleteBlobIfUnused(id).catch(()=>{});
    return changed;
  }
  async _deleteBlobIfUnused(id){
    const userId=this.store.userId;
    if(userId){for(const meta of this.store.repo.list(userId)){const project=meta.id===this.store.projectId?this.store.project:this.store.repo.get(userId,meta.id);if(project?.assets?.some(asset=>asset.id===id))return false}}
    return this.blobStore.delete(id);
  }
  async _optimizedFile(file){
    if(!file||file.size<1400*1024||!String(file.type||'').startsWith('image/')||['image/gif','image/svg+xml','image/avif'].includes(file.type))return {file,optimized:false,originalSize:file?.size||0};
    try{
      let image; if(globalThis.createImageBitmap)image=await createImageBitmap(file); else {const url=URL.createObjectURL(file);image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url})}
      const max=2200,scale=Math.min(1,max/Math.max(image.width||image.naturalWidth,image.height||image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((image.width||image.naturalWidth)*scale));canvas.height=Math.max(1,Math.round((image.height||image.naturalHeight)*scale));const ctx=canvas.getContext('2d');if(!ctx)return {file,optimized:false,originalSize:file.size};ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));if(!blob||blob.size>=file.size*.96)return {file,optimized:false,originalSize:file.size};
      const derived=new File([blob],String(file.name||'image').replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp',lastModified:file.lastModified||Date.now()});return {file:derived,optimized:true,originalSize:file.size,width:canvas.width,height:canvas.height};
    }catch{return {file,optimized:false,originalSize:file?.size||0}}
  }
  async addFile(file,{purpose='',folder='',tags=[],alt='',attachTo=null}={}){
    if(!file||typeof file.size!=='number')throw new Error('اختر ملفًا صالحًا أولًا.');
    if(file.size>MAX_ASSET_BYTES)throw new Error('حجم الملف أكبر من الحد الحالي (75 ميجابايت). قلّل الحجم ثم جرّب مرة أخرى.');
    this.uploading++;
    try{
      const optimized=await this._optimizedFile(file);const storedFile=optimized.file;const assetId=uid('asset');
      // Put binary first to avoid the autosave timer briefly writing a huge data URL to localStorage.
      const stored=await this.blobStore.put(assetId,storedFile,{name:storedFile.name||file.name,type:storedFile.type||file.type});
      if(!stored){const inlineTotal=(this.store.project.assets||[]).filter(a=>a.storageRef!=='indexeddb').reduce((sum,a)=>sum+Number(a.size||0),0);if(storedFile.size>1200*1024||inlineTotal+storedFile.size>1800*1024)throw new Error('هذا المتصفح لا يسمح بتخزين الملفات الكبيرة خارج بيانات المشروع. صغّر الملف إلى أقل من 1.2 ميجابايت أو افتح المشروع في متصفح يسمح بتخزين الوسائط.')}
      const data=await dataUrlFromFile(storedFile);
      const raw={id:assetId,originalName:file.name||storedFile.name,name:'',type:storedFile.type||file.type||'application/octet-stream',size:storedFile.size,originalSize:optimized.originalSize,data,storageRef:stored?'indexeddb':'',folder:folder||purpose||assetKind(storedFile.type,storedFile.name)||'general',tags,alt:alt||String(file.name||storedFile.name).replace(/\.[^.]+$/,''),optimized:optimized.optimized,width:optimized.width||0,height:optimized.height||0};
      if(String(raw.type).startsWith('image/')&&!raw.width){try{const url=URL.createObjectURL(storedFile);const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});raw.width=image.naturalWidth;raw.height=image.naturalHeight;URL.revokeObjectURL(url)}catch{}}
      const asset=this.add(raw);
      if(attachTo)this.assignToNode(attachTo,asset.id);
      return this.get(asset.id)||asset;
    } finally {this.uploading=Math.max(0,this.uploading-1)}
  }
  async hydrateProjectAssets(project=this.store.project){
    if(!project||!Array.isArray(project.assets))return {restored:0,migrated:0};
    let restored=0,migrated=0;
    for(const item of [...project.assets]){
      if(item.storageRef==='indexeddb'&&!item.data){
        const record=await this.blobStore.get(item.id);if(record?.blob){try{const file=new File([record.blob],item.filename||record.name||item.originalName||item.name,{type:item.type||record.type||record.blob.type});const data=await dataUrlFromFile(file);this.store.transact('استعادة وسيط محفوظ',p=>{const a=p.assets.find(x=>x.id===item.id);if(a)a.data=data},{record:false,persist:false,emit:false});restored++}catch{}}
      } else if(item.data&&/^data:/i.test(item.data)&&!item.storageRef&&Number(item.size||0)>128*1024){
        try{const blob=await (await fetch(item.data)).blob();const stored=await this.blobStore.put(item.id,blob,{name:item.filename,type:item.type});if(stored){this.store.transact('نقل الوسائط إلى التخزين المخصص',p=>{const a=p.assets.find(x=>x.id===item.id);if(a){a.storageRef='indexeddb';a.data=item.data}},{record:false,persist:false,emit:false});migrated++}}catch{}
      }
    }
    if(restored||migrated){this.store.markDirty();this.store.persist();this.store.emit()}
    return {restored,migrated};
  }
  assignToNode(nodeId,assetId){
    const asset=this.get(assetId);if(!asset)return false;const hitBefore=findNodeGlobal(this.store.project,nodeId);if(!hitBefore)return false;const expected=assetForNodeType(hitBefore.node.type);
    if(expected!=='other'&&expected!=='any'&&expected!=='mixed'&&asset.kind!==expected)return false;
    return this.store.transact('ربط وسيط بالعنصر',project=>{const hit=findNodeGlobal(project,nodeId);if(!hit)return;const n=hit.node;n.props={...(n.props||{}),assetId:asset.id,filename:asset.filename};if(asset.kind==='image')n.props.alt=n.props.alt||asset.alt||asset.name;
      if(n.props.src&&/^data:/i.test(n.props.src))delete n.props.src;if(n.props.url&&/^data:/i.test(n.props.url))delete n.props.url;
    });
  }
  assignMany(nodeId,assetIds){
    const hit=findNodeGlobal(this.store.project,nodeId);if(!hit)return false;const expected=assetForNodeType(hit.node.type);const valid=[...new Set(assetIds||[])].filter(id=>{const a=this.get(id);return a&&(expected==='mixed'||expected==='any'||expected==='other'||a.kind===expected)});
    return this.store.transact('تحديث وسائط متعددة',project=>{const target=findNodeGlobal(project,nodeId)?.node;if(!target)return;target.props={...(target.props||{}),assetIds:valid};if(['gallery','image-carousel'].includes(target.type))target.props.count=Math.max(valid.length,1)});
  }
  compatibleForNode(nodeType){const desired=assetForNodeType(nodeType);return this.list({kind:['any','mixed','other'].includes(desired)?'':desired})}
}
exports.AssetService = AssetService;
