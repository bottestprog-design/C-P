const {storageInfo} = __require("src/core/storage.js");
const RUNTIME_VERSION='27.0.0';
function getClientRuntime(){return {runtime:'html',offline:true,mode:'direct-file',version:RUNTIME_VERSION,storage:storageInfo(),crypto:Boolean(globalThis.crypto?.subtle)}}
exports.RUNTIME_VERSION = RUNTIME_VERSION;
exports.getClientRuntime = getClientRuntime;
});
