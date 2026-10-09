const {deepClone} = __require("src/core/utils.js");
const {DEFAULT_THEME} = __require("src/core/model.js");
const tokenPaths={
  primary:'colors.primary',secondary:'colors.secondary',accent:'colors.accent',surface:'colors.surface',soft:'colors.soft',text:'colors.text',muted:'colors.muted',line:'colors.line',
  space1:'spacing.xs',space2:'spacing.sm',space3:'spacing.md',space4:'spacing.lg',space5:'spacing.xl',space6:'spacing.xxl',
  radiusSm:'radii.sm',radiusMd:'radii.md',radiusLg:'radii.lg',radiusPill:'radii.pill',
  shadowSoft:'shadows.soft',shadowMedium:'shadows.medium',container:'container',
  h1Size:'typography.h1.size',h2Size:'typography.h2.size',bodySize:'typography.body.size',motionFast:'motion.fast',motionNormal:'motion.normal',motionSlow:'motion.slow'
};
function getToken(theme, name, fallback='') {
  const path=tokenPaths[name]||name;
  let current=theme?.tokens;
  for(const part of String(path).split('.')) current=current?.[part];
  return current ?? fallback;
}
function token(name){return `var(--b-${String(name).replace(/[^a-zA-Z0-9_-]/g,'-')})`}
function themeVars(theme={}) {
  const merged={...deepClone(DEFAULT_THEME),...deepClone(theme),tokens:{...deepClone(DEFAULT_THEME.tokens),...(theme.tokens||{})}};
  const vars={};
  Object.keys(tokenPaths).forEach(name=>{const value=getToken(merged,name,'');if(value!==''&&value!=null)vars[`--b-${name}`]=value});
  vars['--b-font-family']=merged.font||'system-ui';
  vars['--b-primary']=getToken(merged,'primary',merged.primary);
  vars['--b-text']=getToken(merged,'text',merged.text);
  vars['--b-muted']=getToken(merged,'muted',merged.muted);
  vars['--b-line']=getToken(merged,'line','#e6e8ef');
  return vars;
}
function themeCss(theme={}) {
  return Object.entries(themeVars(theme)).map(([key,value])=>`${key}:${value};`).join('');
}
function applyThemeVars(element,theme){if(!element)return;Object.entries(themeVars(theme)).forEach(([key,value])=>element.style.setProperty(key,value));}
function themeSnapshot(theme){return deepClone({...DEFAULT_THEME,...theme,tokens:{...DEFAULT_THEME.tokens,...(theme?.tokens||{})}})}
exports.tokenPaths = tokenPaths;
exports.getToken = getToken;
exports.token = token;
exports.themeVars = themeVars;
exports.themeCss = themeCss;
exports.applyThemeVars = applyThemeVars;
exports.themeSnapshot = themeSnapshot;
