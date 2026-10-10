const {deepClone,uid} = __require("src/core/utils.js");
const VARIABLE_TYPES=Object.freeze(['text','number','color','url','boolean','json']);
const RESERVED_VARIABLES=new Set(['_meta']);
function normalizeVariables(source={}){
  const out={};
  if(source&&typeof source==='object'&&!Array.isArray(source)){
    for(const [key,raw] of Object.entries(source)){
      if(RESERVED_VARIABLES.has(key)) continue;
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&('value' in raw || 'type' in raw)){
        out[key]={id:String(raw.id||uid('var')),name:String(raw.name||key),type:VARIABLE_TYPES.includes(raw.type)?raw.type:'text',value:deepClone(raw.value??''),description:String(raw.description||'')};
      }else out[key]={id:uid('var'),name:key,type:'text',value:deepClone(raw),description:''};
    }
  }
  return out;
}
function listVariables(project){return Object.entries(normalizeVariables(project?.variables)).map(([key,v])=>({key,...v})).sort((a,b)=>a.name.localeCompare(b.name,'ar'))}
function getVariable(project,key,fallback=''){const value=normalizeVariables(project?.variables)[String(key||'')];return value?deepClone(value.value):fallback}
function setVariable(store,key,patch={}){
  const clean=String(key||'').trim().replace(/[^a-zA-Z0-9_\u0600-\u06ff-]/g,'_');
  if(!clean||RESERVED_VARIABLES.has(clean)) return false;
  return store.transact('تعديل متغير الموقع',project=>{
    project.variables=normalizeVariables(project.variables);
    const current=project.variables[clean]||{id:uid('var'),name:clean,type:'text',value:'',description:''};
    project.variables[clean]={...current,...deepClone(patch),id:current.id||uid('var'),name:String(patch.name||current.name||clean),type:VARIABLE_TYPES.includes(patch.type)?patch.type:(current.type||'text')};
  });
}
function removeVariable(store,key){return store.transact('حذف متغير الموقع',project=>{if(project.variables)delete project.variables[String(key||'')];})}
function resolveVariableValue(value,project){
  if(typeof value!=='string') return value;
  const exact=value.match(/^var:([a-zA-Z0-9_\u0600-\u06ff-]+)$/);
  if(exact) return getVariable(project,exact[1],value);
  return value.replace(/\{\{var:([a-zA-Z0-9_\u0600-\u06ff-]+)\}\}/g,(_,key)=>String(getVariable(project,key,'')));
}
exports.VARIABLE_TYPES = VARIABLE_TYPES;
exports.RESERVED_VARIABLES = RESERVED_VARIABLES;
exports.normalizeVariables = normalizeVariables;
exports.listVariables = listVariables;
exports.getVariable = getVariable;
exports.setVariable = setVariable;
exports.removeVariable = removeVariable;
exports.resolveVariableValue = resolveVariableValue;
});
