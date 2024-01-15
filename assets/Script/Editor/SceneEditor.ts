import KeyboardListener from "../Components/KeyboardListener";
import { Config } from "../Const/Config";
import { MapUtils } from "../Utils/MapUtils";

const {ccclass, property, executeInEditMode, menu} = cc._decorator;
@ccclass
@executeInEditMode
@menu('Script/SceneEditor/SceneEditor')
export default class SceneEditor extends cc.Component {
    @property(cc.Node) nodeBg: cc.Node = null;
    @property(cc.Node) nodMap: cc.Node = null;
    @property(cc.Graphics) graphGrids: cc.Graphics = null;
    @property(cc.Graphics) graphTarget: cc.Graphics = null;

    _posTarget: cc.Vec2 = null;

    //================================================ cc.Component
    start () {
        //====================== 
        CC_PREVIEW && this.node.addComponent(KeyboardListener);

        //====================== 
        this.node.setContentSize(Config.MapSize)
        this.nodMap.position = cc.v3(-Config.MapSize.width/2, -Config.MapSize.height/2);

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchBegan, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnded, this);

        //====================== 
        this.showGrids();
    }

    //================================================ 
    onTouchBegan(event: cc.Event.EventTouch) {
        var touch = event.touch;

        var posWorld = touch.getLocation();
        var posLocal = this.graphGrids.node.convertToNodeSpaceAR(posWorld);
        var posLogic = MapUtils.pos_view2map(posLocal);

        console.log('[develop] ========', 'world', posWorld.x, posWorld.y);
        console.log('[develop] ========', 'local', posLocal.x, posLocal.y);
        console.log('[develop] ========', 'logic', posLogic.x, posLogic.y);

        this.showTarget(posLogic);
    }

    onTouchEnded(event: cc.Event.EventTouch) {
    }

    /**
     * 绘制网格
     * 以左下角为原点的笛卡尔坐标系
     */
    showGrids() {
        var gw = Config.GridSize.width;
        var gh = Config.GridSize.height;
        var mw = Config.MapSize.width;
        var mh = Config.MapSize.height;
        var origin = cc.Vec2.ZERO;

        /** 画横线 */
        for (var y = origin.y; y < mh; y += gh) {
            this.graphGrids.moveTo(origin.x, y);
            this.graphGrids.lineTo(mw, y);
        }
        this.graphGrids.stroke();

        /** 画纵线 */
        for (var x = origin.x; x < mw; x += gw) {
            this.graphGrids.moveTo(x, origin.y);
            this.graphGrids.lineTo(x, mh);
        }
        this.graphGrids.stroke();
    }

    /**
     * 绘制目标地点
     */
    showTarget(pos: cc.Vec2) {
        var gw = Config.GridSize.width;
        var gh = Config.GridSize.height;

        var x = pos.x * gw + Config.MapSize.width/2;
        var y = pos.y * gh + Config.MapSize.height/2;

        this.graphTarget.clear();
        this.graphTarget.fillRect(x, y, gw, gh);
        this._posTarget = pos;
    }
}
