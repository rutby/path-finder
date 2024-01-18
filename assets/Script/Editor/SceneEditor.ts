import EventMgr from "../Components/EventMgr";
import KeyboardListener from "../Components/KeyboardListener";
import { Config, EnumFlagType, EnumOrientation, Events, IGrid, IMoveUnit, IPos, ISegment } from "../Const/Config";
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
    @property(cc.Graphics) graphSegmentsHori: cc.Graphics = null;
    @property(cc.Graphics) graphSegmentsVert: cc.Graphics = null;
    @property(cc.Node) nodeLabels: cc.Node = null;
    @property(cc.Node) nodeArrows: cc.Node = null;
    @property(cc.Node) nodeUnits: cc.Node = null;
    @property(cc.TiledMap) tilemap: cc.TiledMap = null;

    _currMapPos: cc.Vec2 = null;
    _labels: cc.Label[] = [];
    _arrows: cc.Node[] = [];
    _units: IMoveUnit[] = [];
    /** 地图网格尺寸 50x50 */
    _mapSize: cc.Size = null;
    _grids: IGrid[] = null;
    _graph: any = {};
    _points: IGrid[] = null;
    _segments: ISegment[] = null;

    //================================================ cc.Component
    start () {
        //====================== 
        CC_PREVIEW && this.node.addComponent(KeyboardListener);
        EventMgr.sub(Events.Debug_Switch_Profiler, this.onEventSwitchProfiler, this);
        EventMgr.sub(Events.Debug_Switch_Units, this.onEventSwitchUnits, this);
        EventMgr.sub(Events.Debug_Switch_VectorMap, this.onEventSwitchVector, this);
        EventMgr.sub(Events.Debug_Switch_KeyPoint, this.onEventSwitchKeypoint, this);
        EventMgr.sub(Events.Debug_Switch_Index, this.onEventSwitchIndex, this);
        EventMgr.sub(Events.Debug_Switch_Optmize, this.onEventSwitchOptmize, this);

        //====================== 
        this._mapSize = this.tilemap.getMapSize();
        var mapViewSize = cc.size(this._mapSize.width * GridW, this._mapSize.height * GridH);
        this.node.setContentSize(mapViewSize)
        this.nodeMap.position = cc.v3(-mapViewSize.width/2, -mapViewSize.height/2);
        this.nodeUnits.position = cc.v3(GridW/2, GridH/2);

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchBegan, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnded, this);

        //====================== 
        this.showGrids();
        this.reloadAll();
        cc.game.setFrameRate(30);
    }

    protected onDestroy(): void {
        EventMgr.ignore(this);
    }

    protected update(dt: number): void {
        if (this._enableProfiler) {
            let x = MiscUtils.randomRangeInt(0, cc.winSize.width);
            let y = MiscUtils.randomRangeInt(0, cc.winSize.height);
            this.selectTarget(cc.v2(x, y));
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
                }

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

    //================================================ 
    reloadAll() {
        this.loadMap();
        this.loadLabels();
        this.loadArrows();
        this.loadUnits();
    }

    clearAll() {
        this.graphTarget.clear();
        this.graphKeypoint.clear();
        this.graphSegmentsHori.clear();
        this.graphSegmentsVert.clear();

        this._enableProfiler = false;
        this._enableUnits = false;
        this._enableVectorMap = false;
        this._enableKeypoint = false;
        this._enableIndex = false;
    }

    //================================================ events
    _enableProfiler: boolean = false;
    onEventSwitchProfiler() {
        this._enableProfiler = !this._enableProfiler;

        console.log('[develop] ========', this._enableProfiler? '性能测试已开启, 移步至Performance中查看开销': '性能测试已关闭');
    }

    _enableUnits: boolean = false;
    onEventSwitchUnits() {
        if (!this._currMapPos) {
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

        console.log('[develop] ========', this._enableUnits? '移动单位已生成': '移动单位已移除');
    }

    _enableVectorMap: boolean = false;
    onEventSwitchVector() {
        this._enableVectorMap = !this._enableVectorMap;
        this.nodeArrows.active = this._enableVectorMap;

        console.log('[develop] ========', this._enableVectorMap? '向量图预览已开启': '向量图预览已关闭');
    }

    _enableKeypoint: boolean = false;
    onEventSwitchKeypoint() {
        this._enableKeypoint = !this._enableKeypoint;
        this.graphKeypoint.node.active = this._enableKeypoint;

        if (this._enableKeypoint) {
            this.showKeypoints();
        }

        console.log('[develop] ========', this._enableKeypoint? '关键点预览已开启': '关键点预览已关闭');
    }

    _enableIndex: boolean = false;
    onEventSwitchIndex() {
        this._enableIndex = !this._enableIndex;

        for(let i = 0; i < this._grids.length; i++) {
            let grid = this._grids[i];
            let index = MapUtils.convertMapPosToIndex(this._mapSize, grid);
            this._labels[i].string = this._enableIndex? `${index}`: '';
            this._labels[i].node.scale = this._enableIndex? 0.33: 1;
        }

        console.log('[develop] ========', this._enableIndex? '索引预览已开启': '索引预览已关闭');
    }

    _enableOptmize: boolean = Config.EnableOptimize;
    onEventSwitchOptmize() {
        this._enableOptmize = !this._enableOptmize;

        this.clearAll();
        this.reloadAll();

        console.log('[develop] ========', this._enableOptmize? '算法优化已开启': '算法优化已关闭');
    }

    //================================================ 
    onTouchBegan(event: cc.Event.EventTouch) {
        var touch = event.touch;
        var posWorld = touch.getLocation();

        this.selectTarget(posWorld);
    }

    onTouchMove(event: cc.Event.EventTouch) {
        var touch = event.touch;
        var posWorld = touch.getLocation();

        this.selectTarget(posWorld);
    }

    onTouchEnded(event: cc.Event.EventTouch) {
        var touch = event.touch;
        var posWorld = touch.getLocation();
    }

    selectTarget(posWorld: cc.Vec2) {
        var posLocal = this.graphGrids.node.convertToNodeSpaceAR(posWorld);
        var posLogic = MapUtils.convertViewPosToMapPos(posLocal);

        /** 排除地形 */
        let target_index = MapUtils.convertMapPosToIndex(this._mapSize, posLogic);
        let target_grid = this._grids[target_index];
        if (target_grid.flag == EnumFlagType.Terrain) {
            return;
        }

        if (this._currMapPos && this._currMapPos.equals(posLogic)) {
            return;
        }

        this._currMapPos = posLogic;
        this.showTarget();
        this.showHeatMap(true);
    }

    //================================================ display
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

    /** 绘制目标地点 */
    showTarget() {
        if (!this._currMapPos) {
            return;
        }

        this.graphTarget.clear();
        this.fillGrid(this.graphTarget, this._currMapPos);
    }

    _lastMapPos: IPos = null;
    /**
     * 绘制热力图
     */
    showHeatMap(detail?: boolean) {
        // MiscUtils.timeRecordStart('showHeatMap');
        if (this._enableOptmize) {
            MapUtils.delGraphElement(this._mapSize, this._graph, this._grids, this._lastMapPos);
            MapUtils.addGraphElement(this._mapSize, this._graph, this._grids, this._points, this._segments, this._currMapPos);
        }
        MapUtils.createHeatMap(this._mapSize, this._graph, this._grids, this._currMapPos);
        if (this._enableOptmize) {
            MapUtils.createFullHeatMap(this._mapSize, this._grids, this._segments, this._currMapPos);
        }

        /** 显示网格代价 */
        if (detail) {
            for(let i = 0; i < this._grids.length; i++) {
                let grid = this._grids[i];
                this._labels[i].string = grid.flag == EnumFlagType.Path? `${Number(grid.cost).toFixed(0)}`: '';
                this._labels[i].node.scale = 0.5;
            }
        }

        /** 生成向量图 */
        MapUtils.createVectorMap(this._mapSize, this._graph, this._grids);
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
            unit.isArrived = true;
        }

        this._lastMapPos = this._currMapPos;
        // MiscUtils.timeRecordEnd('showHeatMap');
    }

    /** 绘制关键点 */
    showKeypoints() {
        if (!this._points) {
            return;
        }

        /** 显示关键点 */
        this.graphKeypoint.clear();
        for(var i = 0; i < this._points.length; i++) {
            var grid = this._points[i];
            this.fillGrid(this.graphKeypoint, grid);
        }

        /** 显示阻挡线段 */
        this.graphSegmentsHori.clear();
        this.graphSegmentsVert.clear();
        for(let i = 0; i < this._segments.length; i++) {
            let segment = this._segments[i];
            let startPos = segment.points[0];
            let endPos = segment.points[1];
            if (segment.orient == EnumOrientation.Horizontal) {
                for(let x = startPos.x; x <= endPos.x; x++) {
                    this.fillSegment(this.graphSegmentsHori, startPos, endPos);
                }
            } else {
                for(let y = startPos.y; y <= endPos.y; y++) {
                    this.fillSegment(this.graphSegmentsVert, startPos, endPos);
                }
            }
        }
    }

    //================================================ load
    /** 加载地图数据 */
    loadMap() {
        //================================================ 加载网格数据
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
                    index: mapIndex,
                    flag: tiles[tileIndex],
                    cost: -1,
                });
            }
        }
        this._grids = grids;

        //================================================ 生成连通图
        if (this._enableOptmize) {
            /** 生成关键点 */
            this._points = MapUtils.createKeypoints(this._mapSize, this._grids);

            /** 生成阻挡线段 */
            this._segments = MapUtils.createSegments(this._mapSize, this._grids);

            /** 生成关键点连通图 */
            this._graph = MapUtils.createGraphByPoints(this._mapSize, this._points, this._segments, this._grids);
        } else {
            /** 生成网格连通图 */
            this._graph = MapUtils.createGraphByGrids(this._mapSize, this._grids);
        }
    }

    /** 创建用于调试网格的文字集 */
    loadLabels() {
        this._labels = [];
        this.nodeLabels.destroyAllChildren();

        if (CC_EDITOR) {
            return;
        }

        var gw = GridW;
        var gh = GridH;
        var w = this._mapSize.width;
        var h = this._mapSize.height;
        var halfPos = cc.v2(gw/2, gh/2);
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
    loadArrows() {
        this._arrows = [];
        this.nodeArrows.destroyAllChildren();

        if (CC_EDITOR) {
            return;
        }

        var gw = GridW;
        var gh = GridH;
        var w = this._mapSize.width;
        var h = this._mapSize.height;
        var halfPos = cc.v2(gw/2, gh/2);
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
        this.nodeArrows.active = this._enableVectorMap;
    }

    /** 创建移动单位 */
    loadUnits() {
        this._units = [];
        this.nodeUnits.destroyAllChildren();

        if (CC_EDITOR) {
            return;
        }
        
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

    //================================================ utils
    /** 填充网格 */
    fillGrid(graph: cc.Graphics, mapPos: IPos, noBorder?: boolean) {
        var x = mapPos.x * GridW;
        var y = mapPos.y * GridH;
        var w = GridW;
        var h = GridH;

        if (noBorder) {
            x += GridW/8;
            y += GridW/8;
            w -= 2 * GridW/8;
            h -= 2 * GridW/8;
        }

        graph.fillRect(x, y, w, h);
    }

    /** 填充连续网格 */
    fillSegment(graph: cc.Graphics, startMapPos: IPos, endMapPos: IPos,) {
        var x = startMapPos.x * GridW;
        var y = startMapPos.y * GridH;
        var w = (endMapPos.x - startMapPos.x + 1) * GridW;
        var h = (endMapPos.y - startMapPos.y + 1) * GridH;

        x += GridW/8;
        y += GridW/8;
        w -= 2 * GridW/8;
        h -= 2 * GridW/8;

        graph.fillRect(x, y, w, h);

    }

    /** 画线 */
    strokeLine(graph: cc.Graphics, startMapPos: IPos, endMapPos: IPos) {
        var sx = startMapPos.x * GridW;
        var sy = startMapPos.y * GridH;
        var ex = endMapPos.x * GridW;
        var ey = endMapPos.y * GridH;

        graph.moveTo(sx, sy);
        graph.lineTo(ex, ey);
        graph.stroke();
    }
}
cc.macro.CLEANUP_IMAGE_CACHE = true;
cc.dynamicAtlasManager.enabled = false;


