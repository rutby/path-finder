import KeyboardListener from "../Components/KeyboardListener";
import { Config } from "../Const/Config";

const {ccclass, property, executeInEditMode, menu} = cc._decorator;
@ccclass
@executeInEditMode
@menu('Script/SceneEditor/SceneEditor')
export default class SceneEditor extends cc.Component {
    @property(cc.Node) nodeBg: cc.Node = null;
    @property(cc.Graphics) graphics: cc.Graphics = null;

    //================================================ cc.Component
    start () {
        //====================== 
        CC_PREVIEW && this.node.addComponent(KeyboardListener);

        //====================== 
        this.nodeBg.setContentSize(Config.MapSize);
        this.graphics.node.position = cc.v3(-Config.MapSize.width/2, -Config.MapSize.height/2);

        //====================== 
        this.showGrids();
    }

    //================================================ 
    /**
     * 绘制网格
     * 以左下角为原点的笛卡尔坐标系
     */
    showGrids() {
        if (!this.graphics) {
            return;
        }

        var gw = Config.GridSize.width;
        var gh = Config.GridSize.height;
        var mw = Config.MapSize.width;
        var mh = Config.MapSize.height;
        var origin = cc.Vec2.ZERO;

        /** 画横线 */
        for (var y = origin.y; y < mh; y += gh) {
            this.graphics.moveTo(origin.x, y);
            this.graphics.lineTo(mw, y);
        }
        this.graphics.stroke();

        /** 画纵线 */
        for (var x = origin.x; x < mw; x += gw) {
            this.graphics.moveTo(x, origin.y);
            this.graphics.lineTo(x, mh);
        }
        this.graphics.stroke();
    }
}
