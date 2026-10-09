const {deepClone} = __require("src/core/utils.js");
const DEVICE_ORDER = ['desktop','tablet','mobile'];

const common = {
  desktop: { maxWidth:'100%', minWidth:0, boxSizing:'border-box' },
  tablet: { maxWidth:'100%', minWidth:0, boxSizing:'border-box' },
  mobile: { maxWidth:'100%', minWidth:0, boxSizing:'border-box' },
};

const PRESETS = {
  desktop: {
    heading:{fontSize:42,lineHeight:1.15}, text:{fontSize:16,lineHeight:1.8}, button:{fontSize:13,paddingY:11,paddingX:20}, link:{fontSize:13},
    section:{paddingY:40,paddingX:24}, container:{paddingX:24}, hero:{paddingY:58,paddingX:28}, card:{padding:20},
    grid:{gap:16,gridTemplateColumns:'repeat(3,minmax(0,1fr))'}, columns:{gap:18,gridTemplateColumns:'repeat(2,minmax(0,1fr))'},
    stack:{gap:12}, spaced:{gap:12}, image:{height:300}, gallery:{gap:10,gridTemplateColumns:'repeat(3,minmax(0,1fr))'}, video:{height:260},
    input:{width:'100%',maxWidth:'100%'}, textarea:{width:'100%',maxWidth:'100%'}, select:{width:'100%',maxWidth:'100%'},
    form:{padding:20}, stats:{gap:12}, pricing:{gap:12}, timeline:{gap:12}, featureGrid:{gap:12},
  },
  tablet: {
    heading:{fontSize:34,lineHeight:1.16}, text:{fontSize:15,lineHeight:1.75}, button:{fontSize:12,paddingY:10,paddingX:18}, link:{fontSize:12},
    section:{paddingY:32,paddingX:20}, container:{paddingX:20}, hero:{paddingY:42,paddingX:24}, card:{padding:17},
    grid:{gap:14,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}, columns:{gap:16,gridTemplateColumns:'repeat(2,minmax(0,1fr))'},
    stack:{gap:10}, spaced:{gap:10}, image:{height:260}, gallery:{gap:8,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}, video:{height:220},
    input:{width:'100%',maxWidth:'100%'}, textarea:{width:'100%',maxWidth:'100%'}, select:{width:'100%',maxWidth:'100%'},
    form:{padding:18}, stats:{gap:10}, pricing:{gap:10}, timeline:{gap:10}, featureGrid:{gap:10},
  },
  mobile: {
    heading:{fontSize:28,lineHeight:1.18}, text:{fontSize:14,lineHeight:1.75}, button:{fontSize:12,paddingY:10,paddingX:16}, link:{fontSize:12},
    section:{paddingY:24,paddingX:16}, container:{paddingX:16}, hero:{paddingY:30,paddingX:18}, card:{padding:15},
    grid:{gap:10,gridTemplateColumns:'1fr'}, columns:{gap:12,gridTemplateColumns:'1fr'},
    stack:{gap:9}, spaced:{gap:10}, image:{height:220}, gallery:{gap:7,gridTemplateColumns:'1fr'}, video:{height:200},
    input:{width:'100%',maxWidth:'100%'}, textarea:{width:'100%',maxWidth:'100%'}, select:{width:'100%',maxWidth:'100%'},
    form:{padding:15}, stats:{gap:9,gridTemplateColumns:'1fr'}, pricing:{gap:9,gridTemplateColumns:'1fr'}, timeline:{gap:9,gridTemplateColumns:'1fr'}, featureGrid:{gap:9,gridTemplateColumns:'1fr'},
  }
};

const TYPE_ALIASES = {
  featuregrid:'featureGrid', 'feature-grid':'featureGrid', 'feature-comparison':'featureGrid',
};
function getDevicePreset(type, device='desktop') {
  const d = PRESETS[device] || PRESETS.desktop;
  const key = TYPE_ALIASES[type] || type;
  return { ...(common[device] || common.desktop), ...(d[key] || {}) };
}
function applyDevicePreset(node, device='desktop', {onlyMissing=true}={}) {
  if (!node || !DEVICE_ORDER.includes(device)) return node;
  node.responsive = node.responsive || {};
  const preset = getDevicePreset(node.type, device);
  const existing = node.responsive[device] || {};
  node.responsive[device] = onlyMissing ? { ...preset, ...existing } : { ...existing, ...preset };
  node.device = node.device || {};
  node.device.created = node.device.created || device;
  node.device.touched = Array.from(new Set([...(node.device.touched || []), device]));
  return node;
}
function applyDevicePresetTree(nodes=[], device='desktop', options={}) {
  const cloned = Array.isArray(nodes) ? nodes : [];
  const visit = node => {
    applyDevicePreset(node, device, options);
    (node.children || []).forEach(visit);
    return node;
  };
  cloned.forEach(visit);
  return cloned;
}
function initializeDevicePresetsTree(nodes=[], createdDevice='desktop') {
  const list = Array.isArray(nodes) ? nodes : [];
  const visit = node => {
    if (!node) return node;
    for (const device of DEVICE_ORDER) applyDevicePreset(node, device, {onlyMissing:true});
    node.device = node.device || {};
    node.device.created = DEVICE_ORDER.includes(createdDevice) ? createdDevice : 'desktop';
    node.device.touched = [node.device.created];
    (node.children || []).forEach(visit);
    return node;
  };
  list.forEach(visit);
  return list;
}
function deviceLabel(device) {
  return ({desktop:'سطح المكتب',tablet:'الجهاز اللوحي',mobile:'الهاتف'})[device] || device;
}
exports.DEVICE_ORDER = DEVICE_ORDER;
exports.getDevicePreset = getDevicePreset;
exports.applyDevicePreset = applyDevicePreset;
exports.applyDevicePresetTree = applyDevicePresetTree;
exports.initializeDevicePresetsTree = initializeDevicePresetsTree;
exports.deviceLabel = deviceLabel;
