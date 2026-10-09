const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
function hexToRgb(input){
  const v=String(input||'').trim().replace(/^#/,'');
  const hex=v.length===3?v.split('').map(x=>x+x).join(''):v;
  if(!/^[0-9a-f]{6}$/i.test(hex))return null;
  return {r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)};
}
function rgbToHex({r,g,b}){return '#'+[r,g,b].map(v=>Math.round(clamp(Number(v),0,255)).toString(16).padStart(2,'0')).join('').toUpperCase()}
function parseColor(input){
  const text=String(input||'').trim();
  if(/^#/.test(text))return hexToRgb(text);
  const rgb=text.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*[\d.]+\s*)?\)$/i);
  if(rgb)return {r:Math.round(Number(rgb[1])),g:Math.round(Number(rgb[2])),b:Math.round(Number(rgb[3]))};
  return null;
}
function rgbToHsl({r,g,b}){
  r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0,s=0;const l=(max+min)/2;
  if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h/=6;}
  return {h:h*360,s:s*100,l:l*100};
}
function hslToRgb({h,s,l}){
  h=((h%360)+360)%360/360;s=clamp(s/100);l=clamp(l/100);if(s===0){const x=Math.round(l*255);return {r:x,g:x,b:x}}
  const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
  const hue=t=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};
  return {r:Math.round(hue(h+1/3)*255),g:Math.round(hue(h)*255),b:Math.round(hue(h-1/3)*255)};
}
function mixColors(a,b,ratio=.5,space='rgb'){
  const ca=parseColor(a),cb=parseColor(b);if(!ca||!cb)return '';
  const t=clamp(Number(ratio),0,1);
  if(space==='hsl'){
    const ah=rgbToHsl(ca),bh=rgbToHsl(cb);let dh=((bh.h-ah.h+540)%360)-180;const h=ah.h+dh*t;
    return rgbToHex(hslToRgb({h,s:ah.s+(bh.s-ah.s)*t,l:ah.l+(bh.l-ah.l)*t}));
  }
  return rgbToHex({r:ca.r+(cb.r-ca.r)*t,g:ca.g+(cb.g-ca.g)*t,b:ca.b+(cb.b-ca.b)*t});
}
function gradientColors(stops=[],angle=90){
  const clean=(Array.isArray(stops)?stops:[]).map((stop,i)=>({color:parseColor(stop.color)?rgbToHex(parseColor(stop.color)):String(stop.color||'#000000'),position:stop.position==null?Math.round((i/Math.max(1,stops.length-1))*100):Number(stop.position)})).slice(0,8);
  if(clean.length<2)return clean[0]?.color||'#000000';
  return `linear-gradient(${Number(angle)||90}deg, ${clean.map(s=>`${s.color} ${clamp(s.position,0,100)}%`).join(', ')})`;
}
function contrastLuminance(color){const c=parseColor(color);if(!c)return 0;const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)}
function contrastRatio(a,b){const l1=contrastLuminance(a),l2=contrastLuminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
function bestTextColor(background){return contrastRatio(background,'#000000')>=contrastRatio(background,'#FFFFFF')?'#000000':'#FFFFFF'}
exports.hexToRgb = hexToRgb;
exports.rgbToHex = rgbToHex;
exports.parseColor = parseColor;
exports.rgbToHsl = rgbToHsl;
exports.hslToRgb = hslToRgb;
exports.mixColors = mixColors;
exports.gradientColors = gradientColors;
exports.contrastLuminance = contrastLuminance;
exports.contrastRatio = contrastRatio;
exports.bestTextColor = bestTextColor;
