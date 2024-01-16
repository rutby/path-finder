import EventMgr from "../Components/EventMgr";
import KeyboardListener from "../Components/KeyboardListener";
import { Config, Events, IGrid, IPos } from "../Const/Config";
import { MapUtils } from "../Utils/MapUtils";
import { MiscUtils } from "../Utils/MiscUtils";

const {ccclass, property, executeInEditMode, menu} = cc._decorator;
@ccclass
@executeInEditMode
@menu('Script/SceneEditor/SceneEditor')
export default class SceneEditor extends cc.Component {
    @property(cc.Node) nodeBg: cc.Node = null;
    @property(cc.Node) nodeMap: cc.Node = null;
    @property(cc.Graphics) graphGrids: cc.Graphics = null;
    @property(cc.Graphics) graphTarget: cc.Graphics = null;
    @property(cc.Node) nodeLabel: cc.Node = null;
    @property(cc.TiledMap) tilemap: cc.TiledMap = null;

    _posTouchBegan: cc.Vec2 = null;
    _posTarget: cc.Vec2 = null;
    _labels: cc.Label[] = [];
    _mapSize: cc.Size = null;
    _grids: IGrid[] = null;

    //================================================ cc.Component
    start () {
        //====================== 
        CC_PREVIEW && this.node.addComponent(KeyboardListener);
        EventMgr.sub(Events.Debug_Switch_Profiler, this.onEventSwitchProfiler, this);

        //====================== 
        this._mapSize = this.tilemap.getMapSize();
        var mapViewSize = cc.size(this._mapSize.width * Config.GridSize.width, this._mapSize.height * Config.GridSize.height);
        this.node.setContentSize(mapViewSize)
        this.nodeMap.position = cc.v3(-mapViewSize.width/2, -mapViewSize.height/2);

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchBegan, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnded, this);

        //====================== 
        this.createLabels();
        this.showGrids();
        cc.game.setFrameRate(30);
    }

    protected onDestroy(): void {
        EventMgr.ignore(this);
    }

    protected update(dt: number): void {
        if (this._enableProfiler) {
            var x = MiscUtils.randomRangeInt(0, 49);
            var y = MiscUtils.randomRangeInt(0, 49);
            this._posTarget = cc.v2(x, y);
            this.showHeatMap(true);
        }
    }

    //================================================ events
    _enableProfiler: boolean = false;
    onEventSwitchProfiler() {
        this._enableProfiler = !this._enableProfiler;
    }

    //================================================ 
    onTouchBegan(event: cc.Event.EventTouch) {
        var touch = event.touch;
        this._posTouchBegan = touch.getLocation();
    }

    onTouchEnded(event: cc.Event.EventTouch) {
        var touch = event.touch;
        var posWorld = touch.getLocation();
        if (posWorld.sub(this._posTouchBegan).mag() > 1) {
            return;
        }

        var posLocal = this.graphGrids.node.convertToNodeSpaceAR(posWorld);
        var posLogic = MapUtils.convertViewPosToMapPos(posLocal);

        this._posTarget = posLogic;
        this.showTarget();
        this.showHeatMap(true);
    }

    /**
     * 绘制网格
     * 以左下角为原点的笛卡尔坐标系
     */
    showGrids() {
        var gw = Config.GridSize.width;
        var gh = Config.GridSize.height;
        var mw = this._mapSize.width * gw;
        var mh = this._mapSize.height * gh;
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
    showTarget() {
        if (!this._posTarget) {
            return;
        }

        var gw = Config.GridSize.width;
        var gh = Config.GridSize.height;
        var mw = this._mapSize.width * gw;
        var mh = this._mapSize.height * gh;

        var x = this._posTarget.x * gw + mw/2;
        var y = this._posTarget.y * gh + mh/2;

        this.graphTarget.clear();
        this.graphTarget.fillRect(x, y, gw, gh);
    }

    /**
     * 绘制热力图
     */
    showHeatMap(showLabel?: boolean) {
        if (!this._grids) {
            var grids: IGrid[] = [];
            var tiles = this.tilemap.getLayers()[0].getTiles();
            var mh = this._mapSize.height;
            var mw = this._mapSize.width;
            /** tilemap以左上角为原点 从左到右, 从上到下 */
            for(var y = 0; y < mh; y++) {
                for(var x = 0; x < mw; x++) {
                    var fy = (mh - y - 1);
                    var tileIndex = fy * mw + x;
                    var mapIndex = y * mw + x;
                    var mapPos = MapUtils.convertIndexToMapPos(this._mapSize, mapIndex);
                    grids.push({
                        x: mapPos.x,
                        y: mapPos.y,
                        flag: tiles[tileIndex],
                        cost: 0,
                    });
                }
            }
            this._grids = grids;
        }

        MapUtils.createHeatMap(this._mapSize, this._grids, this._posTarget);

        /** 显示网格代价 */
        if (showLabel) {
            for(var i = 0; i < this._grids.length; i++) {
                this._labels[i].string = `${this._grids[i].cost}`;
            }
        }
    }

    /** 创建用于调试网格的文字集 */
    createLabels() {
        if (CC_EDITOR) {
            this.nodeLabel.destroyAllChildren();
            return;
        }

        var gw = Config.GridSize.width;
        var gh = Config.GridSize.height;
        var w = this._mapSize.width;
        var h = this._mapSize.height;
        var halfPos = cc.v2(gw/2, gh/2);
        this._labels = [];
        for(var y = 0; y < h; y++) {
            for(var x = 0; x < w; x++) {
                var grid = {x: x, y: y};
                var viewPos = MapUtils.convertMapPosToViewPos(grid);
                
                var node = new cc.Node();
                node.parent = this.nodeLabel;
                node.setPosition(viewPos.add(halfPos));
                node.scale = 0.5;
                node.color = cc.Color.BLACK;
                var label = node.addComponent(cc.Label);
                label.string = ``;
                label.cacheMode = cc.Label.CacheMode.CHAR;
                this._labels.push(label);
            }
        }
    }
}
cc.macro.CLEANUP_IMAGE_CACHE = true;
cc.dynamicAtlasManager.enabled = false;


