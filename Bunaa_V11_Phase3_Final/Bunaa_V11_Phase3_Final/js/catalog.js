(function(w){
'use strict';
const M=w.Bunaa.Model,C={};
C.categories=M.categories;
C.items=Object.keys(M.defs).map(type=>({type,name:M.label(type),category:M.category(type),container:M.isContainer(type),icon:M.icon(type)}));
C.search=(query,category)=>{const q=String(query||'').trim().toLowerCase();return C.items.filter(x=>(!q||x.name.toLowerCase().includes(q)||x.type.toLowerCase().includes(q))&&(!category||category==='الكل'||x.category===category))};
C.groups=()=>C.categories.slice(1).map(category=>({category,items:C.items.filter(x=>x.category===category)}));
w.Bunaa.Catalog=C;
})(window);