import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {join,normalize,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('./',import.meta.url));
const port=Number(process.env.PORT||8765);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};

createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/',`http://127.0.0.1:${port}`);
    let pathname=decodeURIComponent(url.pathname);
    if(pathname==='/'||pathname==='')pathname='/index.html';
    const relative=pathname.replace(/^[/\\]+/,'');
    const file=normalize(join(root,relative));
    const rootPrefix=root.endsWith('\\')||root.endsWith('/')?root:root+(/^[A-Za-z]:\\/.test(root)?'\\':'/');
    if(file!==root&&!file.startsWith(rootPrefix)){res.writeHead(403);res.end('Forbidden');return}
    const info=await stat(file);
    if(!info.isFile())throw Object.assign(new Error('Not a file'),{code:'ENOENT'});
    res.writeHead(200,{'Content-Type':types[extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(await readFile(file));
  }catch(e){
    const status=e.code==='ENOENT'?404:500;
    res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});
    res.end(status===404?'Not found':`Server error: ${e.message}`);
  }
}).listen(port,'127.0.0.1',()=>console.log(`Bunaa V11: http://127.0.0.1:${port}/`));
