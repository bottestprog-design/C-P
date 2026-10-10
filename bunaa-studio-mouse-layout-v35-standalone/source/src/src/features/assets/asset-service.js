const {addAsset,updateAsset,removeAsset,searchAssets,normalizeAssets,findAsset,assetForNodeType} = __require("src/core/assets.js");
const {dataUrlFromFile} = __require("src/core/utils.js");
const {findNodeGlobal} = __require("src/core/model.js");
class AssetService {
  constructor(store){this.store=store}
  list({query='',folder='',tag='',kind=''}={}){return searchAssets(this.store.project.assets,query,folder,tag,kind)}
  folders(){return [...new Set(normalizeAssets(this.store.project.assets).map(asset=>asset.folder))].sort()}
  tags(){return [...new Set(normalizeAssets(this.store.project.assets).flatMap(asset=>asset.tags))].sort()}
  get(id){return findAsset(this.store.project,id)}
  add(raw){return addAsset(this.store,raw)}
  update(id,patch){return updateAsset(this.store,id,patch)}
  remove(id){return removeAsset(this.store,id)}
  async addFile(file,{purpose='',folder='',tags=[],alt='',attachTo=null}={}){
    const data=await dataUrlFromFile(file);
    const raw={originalName:file.name,name:'',type:file.type,size:file.size,data,folder:folder||purpose||'general',tags,alt:alt||String(file.name).replace(/\.[^.]+$/,'')};
    let width=0,height=0;
    if(String(file.type||'').startsWith('image/')){
      try{const url=URL.createObjectURL(file);const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});width=image.naturalWidth;height=image.naturalHeight;URL.revokeObjectURL(url)}catch{}
    }
    const asset=this.add({...raw,width,height});
    if(attachTo)this.assignToNode(attachTo,asset.id);
    return asset;
  }
  assignToNode(nodeId,assetId){
    const asset=this.get(assetId);if(!asset)return false;
    const hitBefore=findNodeGlobal(this.store.project,nodeId); if(!hitBefore)return false; const expected=assetForNodeType(hitBefore.node.type); if(expected!=='other'&&asset.kind!==expected)return false;
    return this.store.transact('ربط وسيط بالعنصر',project=>{const hit=findNodeGlobal(project,nodeId);if(!hit)return;const n=hit.node;n.props={...(n.props||{}),assetId:asset.id};
      if(asset.kind==='image'){n.props.src=asset.data;n.props.alt=n.props.alt||asset.alt||asset.name}
      else if(asset.kind==='video'){n.props.src=asset.data}
      else if(asset.kind==='audio'){n.props.src=asset.data}
      else {n.props.url=asset.data;n.props.filename=asset.filename}
    });
  }
  compatibleForNode(nodeType){const desired=assetForNodeType(nodeType);return this.list({kind:desired})}
}
exports.AssetService = AssetService;
});
