import { Config, Events } from "../Const/Config";
import EventMgr from "./EventMgr";

const { ccclass } = cc._decorator;
@ccclass
/** 键盘按键监听, 用于调试时快速执行指定行为 */
export default class KeyboardListener extends cc.Component {
	private _cmdMap: any = null;
    
	//================================================ cc.Component
	protected start(): void {
		if (CC_BUILD) return;

		cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onEventKeyDown, this);

		this._cmdMap = {
            //================================================ 镜头移动
            ['A'.charCodeAt(0)]: {
				desc: '镜头左移',
				func: () => {
                    
                    cc.Camera.main.node.x = cc.Camera.main.node.x - Config.GridSize.width;
				},
			},
            ['S'.charCodeAt(0)]: {
				desc: '镜头下移',
				func: () => {
                    cc.Camera.main.node.y = cc.Camera.main.node.y - Config.GridSize.height;
				},
			},
            ['D'.charCodeAt(0)]: {
				desc: '镜头右移',
				func: () => {
                    cc.Camera.main.node.x = cc.Camera.main.node.x + Config.GridSize.width;
				},
			},
            ['W'.charCodeAt(0)]: {
				desc: '镜头上移',
				func: () => {
                    cc.Camera.main.node.y = cc.Camera.main.node.y + Config.GridSize.height;
				},
			},

            //================================================ 镜头缩放
			['F'.charCodeAt(0)]: {
				desc: '镜头放大',
				func: () => {
                    cc.Camera.main.zoomRatio = cc.Camera.main.zoomRatio + 0.1;
				},
			},
			['B'.charCodeAt(0)]: {
				desc: '镜头缩小',
				func: () => {
					cc.Camera.main.zoomRatio = cc.Camera.main.zoomRatio - 0.1;
				},
			},

            //================================================ 
            ['R'.charCodeAt(0)]: {
				desc: '重置地图',
				func: () => {
                    cc.Camera.main.zoomRatio = 1;
                    cc.Camera.main.node.x = 0;
                    cc.Camera.main.node.y = 0;
				},
			},
            ['P'.charCodeAt(0)]: {
				desc: '切换性能测试',
				func: () => {
                    EventMgr.pub(Events.Debug_Switch_Profiler);
				},
			},
            ['Q'.charCodeAt(0)]: {
				desc: '生成移动单位',
				func: () => {
                    EventMgr.pub(Events.Debug_Switch_Units);
				},
			},
            ['V'.charCodeAt(0)]: {
				desc: '切换向量图',
				func: () => {
                    EventMgr.pub(Events.Debug_Switch_VectorMap);
				},
			},
            ['K'.charCodeAt(0)]: {
				desc: '切换关键点',
				func: () => {
                    EventMgr.pub(Events.Debug_Switch_KeyPoint);
				},
			},
		};
	}

	protected onDestroy(): void {
		if (CC_BUILD) return;

		cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onEventKeyDown, this);
	}

    //================================================ Events
	/** 按键事件监听 */
	private onEventKeyDown(event): void {
        var keyCode = event.keyCode;
        
        if (this._cmdMap[keyCode]) {
			this._cmdMap[keyCode].func.apply(this);
            console.log('[develop] ========', '按键监听已触发:', this._cmdMap[keyCode].desc);
        }
    }
}
