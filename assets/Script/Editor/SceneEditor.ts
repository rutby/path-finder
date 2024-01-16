import EventMgr from "../Components/EventMgr";
import KeyboardListener from "../Components/KeyboardListener";
import { Config, EnumFlagType, Events, IGrid, IMoveUnit, IPos } from "../Const/Config";
import { MapUtils } from "../Utils/MapUtils";
import { MiscUtils } from "../Utils/MiscUtils";

var GridW = Config.GridSize.width;
var GridH = Config.GridSize.height;

const {ccclass, property, executeInEditMode, menu} = cc._decorator;
@ccclass
@executeInEditMode
@menu('Script/SceneEditor/SceneEditor')
export default class SceneEditor extends cc.Component {
    @property(cc.Node) nodeBg: cc.Node = null;
    @property(cc.Node) nodeMap: cc.Node = null;
    @property(cc.Graphics) graphGrids: cc.Graphics = null;
    @property(cc.Graphics) graphTarget: cc.Graphics = null;
    @property(cc.Graphics) graphKeypoint: cc.Graphics = null;
    @property(cc.Node) nodeLabels: cc.Node = null;
    @property(cc.Node) nodeArrows: cc.Node = null;
    @property(cc.Node) nodeUnits: cc.Node = null;
    @property(cc.TiledMap) tilemap: cc.TiledMap = null;

    _posTouchBegan: cc.Vec2 = null;
    _targetMapPos: cc.Vec2 = null;
    _labels: cc.Label[] = [];
    _arrows: cc.Node[] = [];
    _units: IMoveUnit[] = [];
    /** 地图网格尺寸 50x50 */
    _mapSize: cc.Size = null;
    _grids: IGrid[] = null;

    //================================================ cc.Component
    start () {
        //====================== 
        CC_PREVIEW && this.node.addComponent(KeyboardListener);
        EventMgr.sub(Events.Debug_Switch_Profiler, this.onEventSwitchProfiler, this);
        EventMgr.sub(Events.Debug_Switch_Units, this.onEventSwitchUnits, this);
        EventMgr.sub(Events.Debug_Switch_VectorMap, this.onEventSwitchVector, this);
        EventMgr.sub(Events.Debug_Switch_KeyPoint, this.onEventSwitchKeypoint, this);

        //====================== 
        this._mapSize = this.tilemap.getMapSize();
        var mapViewSize = cc.size(this._mapSize.width * GridW, this._mapSize.height * GridH);
        this.node.setContentSize(mapViewSize)
        this.nodeMap.position = cc.v3(-mapViewSize.width/2, -mapViewSize.height/2);
        this.nodeUnits.position = cc.v3(GridW/2, GridH/2);

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchBegan, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnded, this);

        //====================== 
        this.loadMap();
        this.createLabels();
        this.createArrows();
        this.createUnits();
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
            this._targetMapPos = cc.v2(x, y);
            this.showHeatMap(true);
        }

        if (this._enableUnits) {
            var moveSpeed = 4;
            var disStep = moveSpeed * dt;

            for(var i = 0; i < this._units.length; i++) {
                var unit = this._units[i];
                if (unit.ended) {
                    continue;
                }
                
                /** 选择下个目标点 */
                if (unit.isArrived) {
                    var mapPos = MapUtils.convertViewPosToMapPos(unit.node.position);
                    var mapIndex = MapUtils.convertMapPosToIndex(this._mapSize, mapPos);
                    var grid = this._grids[mapIndex];
                    if (grid.prev) {
                        unit.dstMapPos = grid.prev;
                        unit.isArrived = false;
                    } else {
                        unit.ended = true;
                    }
                } else {
                    var curVec2 = cc.v2(unit.curMapPos.x, unit.curMapPos.y);
                    var dstVec2 = cc.v2(unit.dstMapPos.x, unit.dstMapPos.y);
                    let disTotal = dstVec2.sub(curVec2).mag();
                    let percent = 1;
                    if (disTotal > 0.0001) {
                        //@todo(chentao)
                        percent = cc.misc.clamp01(disStep / disTotal);
                    }
                    unit.curMapPos = curVec2.lerp(dstVec2, percent);
                    unit.node.setPosition(MapUtils.convertMapPosToViewPos(unit.curMapPos));

                    if (percent == 1) {
                        unit.isArrived = true;
                    }
                }
            }
        }
    }

    //================================================ events
    _enableProfiler: boolean = false;
    onEventSwitchProfiler() {
        this._enableProfiler = !this._enableProfiler;
    }

    _enableUnits: boolean = false;
    onEventSwitchUnits() {
        if (!this._targetMapPos) {
            return;
        }
        this._enableUnits = !this._enableUnits;
        this.nodeUnits.active = this._enableUnits;

        /** 随机分配初始位置 */
        if (this._enableUnits) {
            var occupied = {};
            for(var i = 0; i < Config.MaxUnitCount; i++) {
                do {
                    var x = MiscUtils.randomRangeInt(0, 49);
                    var y = MiscUtils.randomRangeInt(0, 49);
                    var mapPos = cc.v2(x, y);
                    var index = MapUtils.convertMapPosToIndex(this._mapSize, mapPos);
                    var grid = this._grids[index];
                } while (grid.flag != EnumFlagType.Path && !occupied[index]);
                occupied[index] = true;

                var unit = this._units[i];
                unit.curMapPos = grid;
                unit.node.setPosition(MapUtils.convertMapPosToViewPos(grid));
                unit.isArrived = true;
            }
        }
    }

    _showVectorMap: boolean = false;
    onEventSwitchVector() {
        this._showVectorMap = !this._showVectorMap;
        this.nodeArrows.active = this._showVectorMap;
    }

    _showKeypoint: boolean = false;
    onEventSwitchKeypoint() {
        this._showKeypoint = !this._showKeypoint;
        this.graphKeypoint.node.active = this._showKeypoint;

        if (this._showKeypoint) {
            this.showKeypoints();
        }
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

        this._targetMapPos = posLogic;
        this.showTarget();
        this.showHeatMap(true);
    }

    /**
     * 绘制网格
     * 以左下角为原点的笛卡尔坐标系
     */
    showGrids() {
        var gw = GridW;
        var gh = GridH;
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
        if (!this._targetMapPos) {
            return;
        }

        this.graphTarget.clear();
        this.fillGrid(this.graphTarget, this._targetMapPos);
    }

    /**
     * 绘制热力图
     */
    showHeatMap(detail?: boolean) {
        MapUtils.createHeatMap(this._mapSize, this._grids, this._targetMapPos);
        /** 显示网格代价 */
        if (detail) {
            for(var i = 0; i < this._grids.length; i++) {
                this._labels[i].string = `${this._grids[i].cost}`;
            }
        }

        /** 生成向量图 */
        MapUtils.createVectorMap(this._mapSize, this._grids);
        /** 显示网格代价 */
        if (detail) {
            for(var i = 0; i < this._grids.length; i++) {
                var grid = this._grids[i];
                var arrow = this._arrows[i];
                if (grid.prev) {
                    var dx = grid.prev.x - grid.x;
                    var dy = grid.prev.y - grid.y;
                    arrow.angle = MiscUtils.vec2deg(cc.v2(dx, dy));
                }
                arrow.active = !!grid.prev;
            }
        }

        /** 重置单位寻路状态 */
        for(var i = 0; i < this._units.length; i++) {
            var unit = this._units[i];
            unit.ended = false;
        }
    }

    /**
     * 绘制关键点
     */
    showKeypoints() {
        MapUtils.createKeypoints(this._mapSize, this._grids);

        this.graphKeypoint.clear();
        for(var i = 0; i < this._grids.length; i++) {
            var grid = this._grids[i];
            if (grid.isKeypoint) {
                this.fillGrid(this.graphKeypoint, grid);
            }
        }
    }

    /** 加载地图数据 */
    loadMap() {
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
                        cost: -1,
                    });
                }
            }
            this._grids = grids;
        }
    }

    /** 创建用于调试网格的文字集 */
    createLabels() {
        if (CC_EDITOR) {
            this.nodeLabels.destroyAllChildren();
            return;
        }

        var gw = GridW;
        var gh = GridH;
        var w = this._mapSize.width;
        var h = this._mapSize.height;
        var halfPos = cc.v2(gw/2, gh/2);
        this._labels = [];
        for(var y = 0; y < h; y++) {
            for(var x = 0; x < w; x++) {
                var grid = {x: x, y: y};
                var viewPos = MapUtils.convertMapPosToViewPos(grid);
                
                var node = new cc.Node();
                node.parent = this.nodeLabels;
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

    /** 创建用于调试网格的方向集 */
    createArrows() {
        if (CC_EDITOR) {
            this.nodeArrows.destroyAllChildren();
            return;
        }

        var gw = GridW;
        var gh = GridH;
        var w = this._mapSize.width;
        var h = this._mapSize.height;
        var halfPos = cc.v2(gw/2, gh/2);
        this._arrows = [];
        for(var y = 0; y < h; y++) {
            for(var x = 0; x < w; x++) {
                var grid = {x: x, y: y};
                var viewPos = MapUtils.convertMapPosToViewPos(grid);
                
                var node = new cc.Node();
                node.parent = this.nodeArrows;
                node.setPosition(viewPos.add(halfPos));
                node.color = cc.Color.CYAN;
                node.anchorX = 0;
                node.active = false;
                var label = node.addComponent(cc.Label);
                label.string = `-`;
                label.cacheMode = cc.Label.CacheMode.CHAR;
                this._arrows.push(node);
            }
        }
        this.nodeArrows.active = this._showVectorMap;
    }

    /** 创建移动单位 */
    createUnits() {
        if (CC_EDITOR) {
            this.nodeUnits.destroyAllChildren();
            return;
        }

        this._units = [];
        for(var i = 0; i < Config.MaxUnitCount; i++) {
            var node = new cc.Node();
            node.parent = this.nodeUnits;
            node.color = cc.Color.GREEN;
            node.scale = 0.5;
            var label = node.addComponent(cc.Label);
            label.string = `@`;
            label.cacheMode = cc.Label.CacheMode.CHAR;
            this._units.push({ node: node, })
        }
        this.nodeUnits.active = this._enableUnits;
    }

    /** 填充网格 */
    fillGrid(graph: cc.Graphics, mapPos: IPos) {
        var x = mapPos.x * GridW;
        var y = mapPos.y * GridH;

        graph.fillRect(x, y, GridW, GridH);
    }
}
cc.macro.CLEANUP_IMAGE_CACHE = true;
cc.dynamicAtlasManager.enabled = false;


