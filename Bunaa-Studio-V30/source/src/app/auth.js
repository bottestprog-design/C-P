const {storage} = __require("src/core/storage.js");
const USERS_KEY='bunaa_v26_users';
const SESSION_KEY='bunaa_v26_session';
const LEGACY_USERS_KEYS=['bunaa_v25_users','bunaa_v21_users','bunaa_v20_users','bunaa_v19_users','bunaa_v18_users','bunaa_v17_users','bunaa_v16_users','bunaa_v15_users','bunaa_v14_users','bunaa_v13_users','bunaa_v12_users'];
const LEGACY_SESSION_KEYS=['bunaa_v25_session','bunaa_v21_session','bunaa_v20_session','bunaa_v19_session','bunaa_v18_session','bunaa_v17_session','bunaa_v16_session','bunaa_v15_session','bunaa_v14_session','bunaa_v13_session','bunaa_v12_session'];

const normalizeEmail=email=>String(email||'').trim().toLowerCase();
const cleanName=name=>String(name||'').trim().replace(/\s+/g,' ');
const isEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const makeId=(prefix='id')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;

async function digest(value){
  const data=new TextEncoder().encode(value);
  if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  let h=2166136261;for(const byte of data){h^=byte;h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0');
}

function parse(key){try{const raw=storage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}}
function loadUsers(){
  const current=parse(USERS_KEY);if(Array.isArray(current))return current;
  for(const key of LEGACY_USERS_KEYS){const legacy=parse(key);if(Array.isArray(legacy)){try{storage.setItem(USERS_KEY,JSON.stringify(legacy))}catch{};return legacy}}
  return [];
}
function saveUsers(users){storage.setItem(USERS_KEY,JSON.stringify(users))}
function loadSession(){
  const current=parse(SESSION_KEY);if(current)return current;
  for(const key of LEGACY_SESSION_KEYS){const legacy=parse(key);if(legacy){try{storage.setItem(SESSION_KEY,JSON.stringify(legacy))}catch{};return legacy}}
  return null;
}
class AuthStore{
  constructor(){this.user=null;this.hydrate()}
  hydrate(){const session=loadSession();const users=loadUsers();try{if(session?.guest&&session.userId==='guest_local'){this.user={id:'guest_local',name:'تجربة محلية',email:'',mode:'normal',guest:true,createdAt:'local'}}else this.user=session?.userId?users.find(item=>item.id===session.userId)||null:null}catch{this.user=null}return this.user}
  get authenticated(){return Boolean(this.user)}
  async register({name,email,password,mode}){
    const clean=cleanName(name),normalized=normalizeEmail(email);if(clean.length<2)throw new Error('اكتب اسمًا صحيحًا.');if(!isEmail(normalized))throw new Error('اكتب بريدًا إلكترونيًا صحيحًا.');if(String(password||'').length<6)throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');if(!['normal','trainee'].includes(mode))throw new Error('اختر نوع الاستخدام.');
    const users=loadUsers();if(users.some(item=>item.email===normalized))throw new Error('هذا البريد مسجل بالفعل. استخدم تسجيل الدخول.');
    const salt=makeId('salt'),passwordHash=await digest(`${salt}:${password}`);const user={id:makeId('user'),name:clean,email:normalized,passwordHash,salt,mode,createdAt:new Date().toISOString()};users.push(user);saveUsers(users);this.user=user;this.saveSession();return user;
  }
  loginGuest(){this.user={id:'guest_local',name:'تجربة محلية',email:'',mode:'normal',guest:true,createdAt:'local'};this.saveSession({guest:true});return this.user}
  async login(email,password){const normalized=normalizeEmail(email),users=loadUsers(),user=users.find(item=>item.email===normalized);if(!user)throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');const passwordHash=await digest(`${user.salt}:${password||''}`);if(passwordHash!==user.passwordHash)throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');this.user=user;this.saveSession();return user}
  updateUser(patch={}){if(!this.user)return null;const users=loadUsers(),index=users.findIndex(item=>item.id===this.user.id);if(index<0)return null;const next={...users[index],...patch,id:users[index].id,email:users[index].email};users[index]=next;saveUsers(users);this.user=next;this.saveSession();return next}
  logout(){this.user=null;try{storage.removeItem(SESSION_KEY)}catch{}}
  saveSession(extra={}){storage.setItem(SESSION_KEY,JSON.stringify({userId:this.user.id,...extra}))}
}
exports.AuthStore = AuthStore;
