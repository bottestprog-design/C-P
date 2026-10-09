const {deepClone,uid} = __require("src/core/utils.js");
const ASSET_KINDS = Object.freeze(['image','video','audio','document','font','other']);
const EXT_BY_TYPE={
  'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg','image/avif':'avif','image/bmp':'bmp','image/tiff':'tif',
  'video/mp4':'mp4','video/webm':'webm','video/ogg':'ogv','video/quicktime':'mov','video/x-matroska':'mkv',
  'audio/mpeg':'mp3','audio/mp4':'m4a','audio/aac':'aac','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/webm':'weba','audio/flac':'flac',
  'application/pdf':'pdf','text/plain':'txt','text/csv':'csv','text/markdown':'md','text/html':'html','text/css':'css','text/javascript':'js','application/javascript':'js','application/json':'json','application/zip':'zip','application/x-zip-compressed':'zip','application/rtf':'rtf','text/rtf':'rtf',
  'application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.ms-powerpoint':'ppt','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx',
  'font/woff':'woff','font/woff2':'woff2','font/ttf':'ttf','font/otf':'otf','application/font-woff':'woff','application/font-woff2':'woff2','application/x-font-ttf':'ttf','application/x-font-opentype':'otf'
};
const KIND_BY_EXTENSION={jpg:'image',jpeg:'image',png:'image',gif:'image',webp:'image',svg:'image',avif:'image',bmp:'image',tif:'image',tiff:'image',mp4:'video',webm:'video',ogv:'video',mov:'video',mkv:'video',mp3:'audio',wav:'audio',ogg:'audio',weba:'audio',m4a:'audio',aac:'audio',flac:'audio',woff:'font',woff2:'font',ttf:'font',otf:'font',pdf:'document',doc:'document',docx:'document',xls:'document',xlsx:'document',ppt:'document',pptx:'document',txt:'document',csv:'document',rtf:'document',md:'document',odt:'document',ods:'document',odp:'document',zip:'other',json:'other',html:'other',css:'other',js:'other',xml:'other'};
const PREFIX_BY_KIND={image:'img',video:'video',audio:'audio',document:'file',font:'font',other:'file'};
function extensionForType(type='',name=''){
  const mime=String(type||'').toLowerCase().split(';')[0];
  if(EXT_BY_TYPE[mime]) return EXT_BY_TYPE[mime];
  const match=String(name||'').match(/\.([a-z0-9]{1,8})$/i); return match?.[1]?.toLowerCase()||'bin';
}
function assetKind(type='',name=''){
  const mime=String(type||'').toLowerCase().split(';')[0].trim();
  if(mime.startsWith('image/')) return 'image';
  if(mime.startsWith('video/')) return 'video';
  if(mime.startsWith('audio/')) return 'audio';
  if(mime.startsWith('font/')) return 'font';
  if(mime==='application/pdf' || mime.includes('document') || mime.includes('wordprocessing') || mime.includes('spreadsheet') || mime.includes('presentation') || mime.includes('font')) return mime.includes('font')?'font':'document';
  const ext=(String(name||'').match(/\.([a-z0-9]{1,8})$/i)||[])[1]?.toLowerCase()||'';
  return KIND_BY_EXTENSION[ext]||'other';
}
function prefixForAsset(raw={}){return PREFIX_BY_KIND[assetKind(raw.type,raw.name)]||'file'}

function nextSequence(assets,kind){
  const prefix=PREFIX_BY_KIND[kind]||'file';
  let max=0;
  for(const asset of normalizeAssets(assets)){
    if(asset.kind!==kind && !String(asset.name||'').startsWith(prefix)) continue;
    const match=String(asset.name||'').match(new RegExp(`^${prefix}(\\d+)$`,'i'));
    if(match) max=Math.max(max,Number(match[1])||0);
  }
  return max+1;
}
function generatedAssetName(assets,raw={}){
  if(typeof raw==='string') raw={type:raw};
  const kind=assetKind(raw.type,raw.originalName||raw.name);
  return `${PREFIX_BY_KIND[kind]||'file'}${nextSequence(assets,kind)}`;
}
function normalizeAsset(asset={},existing=[]){
  const originalName=String(asset.originalName||asset.name||'وسيط');
  const inferredKind=assetKind(asset.type,originalName);const kind=ASSET_KINDS.includes(asset.kind)&&!(asset.kind==='other'&&inferredKind!=='other')?asset.kind:inferredKind;
  let name=String(asset.name||'').trim();
  if(!name || /\.[a-z0-9]{1,8}$/i.test(name)) name=name.replace(/\.[a-z0-9]{1,8}$/i,'');
  if(!/^((img|video|audio|file|font)\d+)$/i.test(name)) name=generatedAssetName(existing, {type:asset.type,name:originalName});
  const extension=String(asset.extension||extensionForType(asset.type,originalName)).toLowerCase();
  const filename=String(asset.filename||`${name}.${extension}`);
  return {
    id:String(asset.id||uid('asset')),
    name,
    filename,
    extension,
    originalName,
    type:String(asset.type||'application/octet-stream'),
    kind,
    purpose:String(asset.purpose||kind),
    size:Number(asset.size||0),
    originalSize:Number(asset.originalSize||asset.size||0),
    optimized:Boolean(asset.optimized),
    storageRef:String(asset.storageRef||''),
    data:String(asset.data||asset.url||''),
    url:String(asset.url||''),
    path:String(asset.path||`assets/${filename}`),
    alt:String(asset.alt||''),
    folder:String(asset.folder||kind),
    tags:Array.isArray(asset.tags)?[...new Set(asset.tags.map(String))]:[],
    width:Number(asset.width||0),
    height:Number(asset.height||0),
    createdAt:asset.createdAt||new Date().toISOString(),
    updatedAt:asset.updatedAt||asset.createdAt||new Date().toISOString(),
  };
}
function normalizeAssets(assets=[]){
  const seen=new Set(); const source=Array.isArray(assets)?assets:[]; const out=[];
  for(const raw of source){
    const asset=normalizeAsset(raw, out);
    if(seen.has(asset.id)) continue;
    // Avoid accidental duplicate generated names while preserving legacy data.
    if(out.some(x=>x.name===asset.name && x.id!==asset.id)) asset.name=generatedAssetName(out,{type:asset.type,name:asset.originalName});
    asset.filename=`${asset.name}.${asset.extension||extensionForType(asset.type,asset.originalName)}`;
    asset.path=`assets/${asset.filename}`;
    seen.add(asset.id);out.push(asset);
  }
  return out;
}
function searchAssets(assets,query='',folder='',tag='',kind=''){
  const q=String(query||'').trim().toLowerCase();
  return normalizeAssets(assets).filter(asset=>{
    const text=`${asset.name} ${asset.filename} ${asset.originalName} ${asset.alt} ${asset.tags.join(' ')} ${asset.folder}`.toLowerCase();
    return (!q||text.includes(q))&&(!folder||asset.folder===folder)&&(!tag||asset.tags.includes(tag))&&(!kind||asset.kind===kind);
  });
}
function addAsset(store,raw={}){
  let asset;
  store.transact('إضافة وسيط',project=>{
    project.assets=normalizeAssets(project.assets);
    asset=normalizeAsset({...raw,name:raw.name||generatedAssetName(project.assets,raw)},project.assets);
    if(project.assets.some(x=>x.name===asset.name)) asset.name=generatedAssetName(project.assets,raw);
    asset.filename=`${asset.name}.${extensionForType(asset.type,asset.originalName||asset.filename)}`;
    asset.path=`assets/${asset.filename}`;
    project.assets.push(deepClone(asset));
  });
  return asset;
}
function updateAsset(store,id,patch={}){
  return store.transact('تعديل بيانات الوسيط',project=>{
    const asset=(project.assets||[]).find(item=>item.id===id); if(!asset)return;
    Object.assign(asset,deepClone(patch),{updatedAt:new Date().toISOString()});
    if(patch.name){asset.name=String(patch.name).trim().replace(/\.[a-z0-9]{1,8}$/i,'')||asset.name;asset.filename=`${asset.name}.${extensionForType(asset.type,asset.originalName)}`;asset.path=`assets/${asset.filename}`;}
  });
}
function removeAsset(store,id){return store.transact('حذف وسيط',project=>{project.assets=(project.assets||[]).filter(item=>item.id!==id);});}
function findAsset(project,id){return normalizeAssets(project?.assets).find(asset=>asset.id===id)||null;}
function assetForNodeType(type){
  if(['image','gallery','avatar','logo','image-text','image-carousel'].includes(type))return 'image';
  if(['video','video-card','video-gallery'].includes(type))return 'video';
  if(['audio','audio-playlist'].includes(type))return 'audio';
  if(type==='document-viewer')return 'document';
  if(['download','file-card'].includes(type))return 'any';
  if(type==='media-grid')return 'mixed';
  return 'other';
}
exports.ASSET_KINDS = ASSET_KINDS;
exports.extensionForType = extensionForType;
exports.assetKind = assetKind;
exports.prefixForAsset = prefixForAsset;
exports.generatedAssetName = generatedAssetName;
exports.normalizeAsset = normalizeAsset;
exports.normalizeAssets = normalizeAssets;
exports.searchAssets = searchAssets;
exports.addAsset = addAsset;
exports.updateAsset = updateAsset;
exports.removeAsset = removeAsset;
exports.findAsset = findAsset;
exports.assetForNodeType = assetForNodeType;
