import { Config } from "../Const/Config";

export class MapUtils {
	static pos_view2map(pos: cc.Vec2): cc.Vec2 {
        var w = Config.GridSize.width;
        var h = Config.GridSize.height;
        return cc.v2(Math.floor(pos.x / w), Math.floor(pos.y / h))
    }
}
