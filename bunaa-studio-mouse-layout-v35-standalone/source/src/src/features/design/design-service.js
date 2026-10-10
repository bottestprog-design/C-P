const {deepClone} = __require("src/core/utils.js");
function setDesignToken(store, group, key, value) {
  return store.transact('تعديل Design Token', project => {
    project.theme.tokens ||= {};
    if (group === '') project.theme.tokens[key] = deepClone(value);
    else if (group.includes('.')) { const parts = group.split('.'); let target = project.theme.tokens; for (const part of parts) target = target[part] ||= {}; target[key] = deepClone(value); }
    else { project.theme.tokens[group] ||= {}; project.theme.tokens[group][key] = deepClone(value); }
    if (group === 'colors' && ['primary','secondary','accent','surface','text','muted'].includes(key)) project.theme[key] = value;
  });
}
function defineClass(store, name, styles = {}) {
  return store.transact('إنشاء Class', project => {
    project.styleLibrary ||= { classes: {}, textStyles: {}, effects: {} };
    project.styleLibrary.classes[name] = deepClone(styles);
  });
}
function defineTextStyle(store, name, styles = {}) {
  return store.transact('إنشاء Text Style', project => {
    project.styleLibrary ||= { classes: {}, textStyles: {}, effects: {} };
    project.styleLibrary.textStyles[name] = deepClone(styles);
  });
}
exports.setDesignToken = setDesignToken;
exports.defineClass = defineClass;
exports.defineTextStyle = defineTextStyle;
});
