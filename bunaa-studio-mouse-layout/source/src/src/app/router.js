const APP_ROUTES=Object.freeze({AUTH:'auth',DASHBOARD:'dashboard',EDITOR:'editor'});
class AppRouter{
  constructor(){this.route=APP_ROUTES.AUTH;this.listeners=new Set()}
  go(route,payload=null){if(!Object.values(APP_ROUTES).includes(route))return false;const changed=this.route!==route;this.route=route;for(const fn of [...this.listeners]){try{fn(route,payload,changed)}catch(error){console.error('AppRouter listener failed',error)}}return changed}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
}
exports.APP_ROUTES = APP_ROUTES;
exports.AppRouter = AppRouter;
});
