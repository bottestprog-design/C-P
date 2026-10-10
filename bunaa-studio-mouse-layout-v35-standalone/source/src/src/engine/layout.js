const {clamp} = __require("src/core/utils.js");
const {getToken} = __require("src/core/design-system.js");
const {resolveVariableValue} = __require("src/core/variables.js");
const DEVICES=['desktop','tablet','mobile'];
const px=v=>typeof v==='number'?`${v}px`:v;
const resolveToken=(value,theme,project)=>{if(typeof value!=='string')return value;const m=value.match(/^token:(.+)$/);if(m)return getToken(theme,m[1],value);return resolveVariableValue(value,project)};
const numericPx=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;const m=String(v??'').trim().match(/^(-?\d+(?:\.\d+)?)px$/i);return m?Number(m[1]):null};
const deviceWidth=(project,device)=>Number(project?.devices?.[device]?.width)||({desktop:1180,tablet:768,mobile:390}[device]||1180);
function keepInsideDevice(s,project,device){
  const width=deviceWidth(project,device);
  const w=numericPx(s.width),mw=numericPx(s.maxWidth),min=numericPx(s.minWidth);
  if(w!=null&&w>width&&device!=='desktop')s.width='100%';
  if(mw!=null&&mw>width)s.maxWidth='100%';
  if(min!=null&&min>width)s.minWidth=0;
  s.maxWidth=s.maxWidth||'100%';
  s.minWidth=0;
  s.boxSizing='border-box';
  return s;
}
function resolveStyle(node,device='desktop',theme={},styleLibrary={},project=null){
  const responsive=node.responsive?.[device]||{};const classStyles=(node.classes||[]).reduce((acc,name)=>({...acc,...(styleLibrary?.classes?.[name]||{})}),{});const textStyle=styleLibrary?.textStyles?.[node.props?.textStyle]||{};const s={...classStyles,...textStyle,...(node.style||{}),...responsive};
  Object.entries(s).forEach(([key,value])=>{s[key]=resolveToken(value,theme,project)});
  keepInsideDevice(s,project,device);
  if(node.type==='section'){s.width=s.width||'100%';s.maxWidth='100%';s.boxSizing='border-box';s.paddingBlock=s.paddingBlock||px(getToken(theme,'space6',44));}
  if(node.type==='container'){s.width=s.width||'100%';s.maxWidth=Math.min(numericPx(s.maxWidth)??getToken(theme,'container',1180),deviceWidth(project,device));s.marginInline=s.marginInline||'auto';s.boxSizing='border-box';s.paddingInline=s.paddingInline||px(getToken(theme,'space4',18));}
  if(['grid','columns'].includes(node.type)){s.display=s.display||'grid';const count=clamp(Number(node.props?.count)||3,1,6);const fallback= device==='mobile'?'1fr':device==='tablet'?`repeat(${Math.min(count,2)},minmax(0,1fr))`:`repeat(${count},minmax(0,1fr))`;s.gridTemplateColumns=s.gridTemplateColumns||fallback;s.gap=s.gap??node.props?.gap??getToken(theme,'space3',12);}
  if(node.type==='stack'||node.type==='spaced'){s.display=s.display||'flex';s.flexDirection=s.flexDirection||'column';s.gap=s.gap??node.props?.gap??getToken(theme,'space3',12);}
  if(node.type==='spaced'){s.flexDirection=device==='mobile'?'column':'row';s.justifyContent=s.justifyContent||'space-between';s.alignItems=s.alignItems||'center';}
  if(node.layout){if(node.layout.display&&node.layout.display!=='block')s.display=s.display||node.layout.display;if(node.layout.gap)s.gap=s.gap??node.layout.gap;if(node.layout.direction)s.flexDirection=s.flexDirection||node.layout.direction;if(node.layout.align==='center')s.alignItems=s.alignItems||'center';if(node.layout.justify==='center')s.justifyContent=s.justifyContent||'center';if(node.layout.wrap)s.flexWrap='wrap';}
  if(s.radius!=null)s.borderRadius=s.radius===getToken(theme,'radiusPill',999)?'999px':px(s.radius);if(s.paddingY!=null)s.paddingBlock=px(s.paddingY);if(s.paddingX!=null)s.paddingInline=px(s.paddingX);if(s.shadow){const shadow=s.shadow==='medium'?getToken(theme,'shadowMedium','0 20px 50px rgba(25,30,55,.12)'):getToken(theme,'shadowSoft','0 12px 30px rgba(25,30,55,.08)');s.boxShadow=shadow}
  if(s.width!=null)s.width=px(s.width);if(s.height!=null)s.height=px(s.height);if(s.maxWidth!=null)s.maxWidth=px(s.maxWidth);if(s.minHeight!=null)s.minHeight=px(s.minHeight);if(!s.color)s.color=getToken(theme,'text',theme.text);
  return s;
}
const numericUnitless=new Set(['opacity','zIndex','fontWeight','lineHeight','flexGrow','flexShrink','order']);
const kebab=s=>s.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);
const styleObjectToCss=s=>Object.entries(s).filter(([k,v])=>v!==undefined&&v!==null&&v!==''&&!['radius','paddingY','paddingX','shadow'].includes(k)).map(([k,v])=>`${kebab(k)}:${typeof v==='number'&&!numericUnitless.has(k)?`${v}px`:v};`).join('');
function propagateStyle(node,device,patch){if(!node)return;node.responsive=node.responsive||{};const ratios={desktop:1,tablet:.78,mobile:.5};for(const d of DEVICES){if(d===device)continue;node.responsive[d]={...(node.responsive[d]||{})};for(const [k,v] of Object.entries(patch)){if(typeof v==='number'&&['fontSize','gap','height','marginTop','marginBottom','paddingY','paddingX'].includes(k))node.responsive[d][k]=Math.round(v*(ratios[d]/ratios[device]));else node.responsive[d][k]=v}}}
exports.DEVICES = DEVICES;
exports.resolveStyle = resolveStyle;
exports.styleObjectToCss = styleObjectToCss;
exports.propagateStyle = propagateStyle;
});
