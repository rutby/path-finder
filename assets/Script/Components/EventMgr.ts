var ToDestroy = 1 << 2;
/**
 * 检查Cocos对象是否未被销毁
 * @param obj 被检测对象
 */
var isValid = function(obj) {
    if (obj.node && obj.node.getComponent) {
        return cc.isValid(obj) && !(obj._objFlags & ToDestroy);
    } else {
        return true;
    }
}

export default class EventMgr {
    static events: any = {};
    static switchLog: boolean = false;

    static sub(eventName, handler, scope){
        if (!eventName || eventName === undefined) {
            console.warn('EventMgr sub err: eventName is undefined!');
            return;
        };
        if(!handler || handler === undefined) {
            console.warn('EventMgr sub err: eventName: ' + eventName + ' & handler is undefined!');
            return;
        }
        
        EventMgr.events[eventName] = EventMgr.events[eventName] || [];
        EventMgr.events[eventName].push({
            scope: scope || this,
            handler: handler
        });
        return handler;
    }
    
    static pub(eventName, params?: any){
        if (!eventName || eventName === undefined) {
            console.warn('EventMgr pub err: eventName is undefined, please check');
            return;
        };

        var fns = EventMgr.events[eventName], i, fn;       
        if(!fns) {
          return;
        }

        EventMgr.switchLog && console.log('=====develop=====', `EventMgr | pub event | ${eventName}`);
                
        var ___additional = { name : eventName };
        var args = Array.prototype.slice.call(arguments, 1);
        args.push(___additional);
        for(i=0;fn=fns[i];i++){
            if(fn !== undefined){
                isValid(fn.scope) && fn.handler.apply(fn.scope, args);
            }
        }
    };

    static ignore(scope) {
        for(var msg in EventMgr.events){
            var obs = EventMgr.events[msg];
            if(obs){
                EventMgr.events[msg] = obs.filter(function(fn){
                    if(fn.scope != scope){
                        return true;
                    } else{
                        EventMgr.switchLog && console.log('=====develop=====', `EventMgr | ignore | ${msg}`);
                        return false;
                    }
                })
            }
        }
    };
}