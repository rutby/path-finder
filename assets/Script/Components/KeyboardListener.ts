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
