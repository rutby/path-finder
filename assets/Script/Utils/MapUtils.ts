import { Config, EnumFlagType, EnumOrientation, IGrid, INode, IPos, ISegment } from "../Const/Config";
import { MiscUtils } from "./MiscUtils";

var Axis4 = [
    cc.v2(0, 1),
    cc.v2(0, -1),
    cc.v2(-1, 0),
    cc.v2(1, 0),
];

var Axis8 = [
    cc.v2(-1, 1),
    cc.v2(0, 1),
    cc.v2(1, 1),
    cc.v2(1, 0),
    cc.v2(1, -1),
    cc.v2(0, -1),
    cc.v2(-1, -1),
    cc.v2(-1, 0),
];

var GridWidth = Config.GridSize.width;
var GridHeight = Config.GridSize.height;

type IGraph = {[key: string]: {[key: string]: number}};
type INearestPoint = {point?: IGrid, cost?: number};
export class MapUtils {
    //================================================ utils
    /** UI坐标转换成格子坐标 */
    static convertViewPosToMapPos(viewPos: IPos): cc.Vec2 {
        return cc.v2(Math.floor(viewPos.x / GridWidth), Math.floor(viewPos.y / GridHeight))
    }
    
    /** 格子坐标转换成UI坐标 */
    static convertMapPosToViewPos(mapPos: IPos): cc.Vec2 {
        return cc.v2(mapPos.x * GridWidth, mapPos.y * GridHeight);
    }

    /** 格子坐标转换成索引 */
    static convertMapPosToIndex(mapSize: cc.Size, posGrid: IPos) {
        return (posGrid.y * mapSize.width) + posGrid.x;
    }

    /** 索引转换成格子坐标 */
    static convertIndexToMapPos(mapSize: cc.Size, index: number): IPos {
        var y = Math.floor(index / mapSize.width);
        var x = index % mapSize.width;
        return {x: x, y: y}
    }

    /** 取四/八方向邻居 */
    static getAxisNeighbors(mapSize: cc.Size, posGrid: IPos, Axis: cc.Vec2[]): IPos[] {
        var arr = [];
        for(var i = 0; i < Axis.length; i++) {
            var dir = Axis[i];
            var dst = {x: posGrid.x + dir.x, y: posGrid.y + dir.y};
            if (dst.x >= 0 && dst.x < mapSize.width && dst.y >= 0 && dst.y < mapSize.height) {
                arr.push(dst);
            }
        }
        return arr;
    }

    /** 线段转矩形 */
    private static segments2rect(segments: ISegment[]): cc.Rect[] {
        let rects = [];
        for(let i = 0; i < segments.length; i++) {
            let segment = segments[i];
            /** 转换成矩形 */
            let startPos = segment.points[0];
            let endPos = segment.points[1];
            rects.push(cc.rect(startPos.x, startPos.y, endPos.x - startPos.x + 1, endPos.y - startPos.y + 1));
        }
        return rects;
    }

    /** 两点间的距离 */
    static getGridDis(pos0: IPos, pos1: IPos) {
        let dx = Math.abs(pos0.x - pos1.x);
        let dy = Math.abs(pos0.y - pos1.y);
        let min = Math.min(dx, dy) * 0.0001;
        let dis = dx + dy;
        /** 为了斜向优先于横纵 */
        dis = dis - min;
        
        return dis;
    }

    /** 斜向连通, 但是两侧都是障碍 */
    static isNarrowCorner(mapSize: cc.Size, map: IGrid[], pos0: IPos, pos1: IPos): boolean {
        var dx = pos1.x - pos0.x;
        var dy = pos1.y - pos0.y;
        if (dx != 0 && dy != 0) {
            var side0 = {x: pos1.x, y: pos0.y};
            var side1 = {x: pos0.x, y: pos1.y};
            var side0_index = this.convertMapPosToIndex(mapSize, side0);
            var side1_index = this.convertMapPosToIndex(mapSize, side1);
            var side0_grid = map[side0_index];
            var side1_grid = map[side1_index];
            if (side0_grid.flag == EnumFlagType.Terrain || side1_grid.flag == EnumFlagType.Terrain) {
                return true;
            }
        }
        return false;
    }

    /** 获得最近的临近关键点 */
    static getNearestPoint(selected_grid: IGrid, result: INearestPoint) {
        let min_cost = null;
        let nearest_grid = null;
        let near_points = selected_grid.nearPoints || [];
        let near_points_dis_cache = selected_grid.nearPointsDisCache;
        for(let j = 0; j < near_points.length; j++) {
            let near_grid = near_points[j];
            let near_cost = near_points_dis_cache[j];
            let total_cost = near_grid.cost + near_cost
            if (min_cost == null || total_cost < min_cost) {
                min_cost = total_cost;
                nearest_grid = near_grid;
            }
        }
        if (min_cost == null) {
            cc.warn('min_cost is null', selected_grid.index);
            min_cost = -1;
        }

        result.point = nearest_grid;
        result.cost = min_cost;
    }

    //================================================ 寻路通用逻辑
    /** 生成热力图 */
    static createHeatMap(mapSize: cc.Size, graph: IGraph, map: IGrid[], targetPos: cc.Vec2) {
        // MiscUtils.timeRecordStart('createHeatMap');
        var open_list: INode[] = [];
        var close_list: INode[] = [];

        /** 重置地图状态 */
        map.forEach(element => {
            element.cost = -1;
            element.prev = null;
            element.isConnectTarget = false;
        });

        var target_index = this.convertMapPosToIndex(mapSize, targetPos);
        var target_node: INode = {index: target_index, cost: 0};
        open_list.push(target_node);
        while(open_list.length > 0) {
            /** 取代价最小的节点 */
            var del_index = 0;
            var selected_node = open_list[del_index];
            for(var i = 0; i < open_list.length; i++) {
                if (selected_node.cost > open_list[i].cost) {
                    del_index = i;
                    selected_node = open_list[i];
                }
            }
            open_list.splice(del_index, 1);
            close_list.push(selected_node);
            
            /** 更新当前点距离 */
            var selected_index = selected_node.index;
            var selected_cost = selected_node.cost;
            map[selected_index].cost = selected_cost;

            /** 获得周边邻居 */
            var neighbors = graph[selected_index];
            if (!neighbors || neighbors.length) {
                cc.warn('neighbors status is wrong', selected_index);
                neighbors = {};
            }
            for(var key in neighbors) {
                let neighbor_cost = neighbors[key];
                let neighor_index = Number(key);
                let combine_cost = neighbor_cost + selected_cost;

                /** 排除关闭列表 */
                if (close_list.find(ele => ele.index == neighor_index)) {
                    continue;
                }

                /** 加入/更新开放列表 */
                var exist_one = open_list.find(ele => ele.index == neighor_index);
                if (!exist_one) {
                    var neighor_node = {index: neighor_index, cost: combine_cost};
                    open_list.push(neighor_node);
                } else {
                    if (exist_one.cost > combine_cost) {
                        exist_one.cost = combine_cost;
                    }
                }
            }
        }
        // MiscUtils.timeRecordEnd('createHeatMap');
    }

    static createFullHeatMap(mapSize: cc.Size, map: IGrid[], segments: ISegment[], targetPos: cc.Vec2) {
        let rects = this.segments2rect(segments);
        let result: INearestPoint = {};

        for(let i = 0; i < map.length; i++) {
            let selected_grid = map[i];
            /** 排除地形 */
            if (selected_grid.flag == EnumFlagType.Terrain) {
                continue;
            }
            /** 排除已生成路径 */
            if (selected_grid.cost >= 0) {
                continue;
            }

            /** 先看能不能直接到目标 */
            if (this.isConnect(rects, selected_grid, targetPos)) {
                selected_grid.cost = this.getGridDis(selected_grid, targetPos);
                selected_grid.isConnectTarget = true;
            } else {
                this.getNearestPoint(selected_grid, result);
                if (result.cost != null) {
                    selected_grid.cost = result.cost;
                } else {
                    cc.warn("can't find nearest point", selected_grid.index);
                }
            }
        }
    }

    private static _posCenter0: IPos = {x: 0, y: 0};
    private static _posCenter1: IPos = {x: 0, y: 0};
    private static _posCorners0: IPos[] = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}];
    private static _posCorners1: IPos[] = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}];
    /** 两点之间是否连通 */
    static isConnect(rects: cc.Rect[], pos0: IPos, pos1: IPos) {
        /** 转换成网格中心点 */
        this._posCenter0.x = pos0.x + 0.5;
        this._posCenter0.y = pos0.y + 0.5;
        this._posCenter1.x = pos1.x + 0.5;
        this._posCenter1.y = pos1.y + 0.5;

        let isConnected = true;
        for(let m = 0; m < rects.length; m++) {
            let rect = rects[m];

            /** 筛选 */
            let minx = Math.min(this._posCenter0.x, this._posCenter1.x);
            if (rect.xMax < minx) {
                continue;
            }
            let maxx = Math.max(this._posCenter0.x, this._posCenter1.x);
            if (rect.x > maxx) {
                continue;
            }
            let miny = Math.min(this._posCenter0.y, this._posCenter1.y);
            if (rect.yMax < miny) {
                continue;
            }
            let maxy = Math.max(this._posCenter0.y, this._posCenter1.y);
            if (rect.y > maxy) {
                continue;
            }

            let isIntersection = MiscUtils.intersectionLineRect(this._posCenter0, this._posCenter1, rect);
            if (!isIntersection) {
                /** 中心点连接判定成功后, 进行四角判定 */
                let offset = 0.4;
                let x0 = this._posCenter0.x;
                let y0 = this._posCenter0.y;
                let x1 = this._posCenter1.x;
                let y1 = this._posCenter1.y;

                this._posCorners0[0].x = x0+offset;
                this._posCorners0[0].y = y0+offset;
                this._posCorners0[1].x = x0+offset;
                this._posCorners0[1].y = y0-offset;
                this._posCorners0[2].x = x0-offset;
                this._posCorners0[2].y = y0-offset;
                this._posCorners0[3].x = x0-offset;
                this._posCorners0[3].y = y0+offset;

                this._posCorners1[0].x = x1+offset;
                this._posCorners1[0].y = y1+offset;
                this._posCorners1[1].x = x1+offset;
                this._posCorners1[1].y = y1-offset;
                this._posCorners1[2].x = x1-offset;
                this._posCorners1[2].y = y1-offset;
                this._posCorners1[3].x = x1-offset;
                this._posCorners1[3].y = y1+offset;
                
                for(let n = 1; n < 4; n++) {
                    let corner0 = this._posCorners0[n];
                    let corner1 = this._posCorners1[n];
                    let isSubIntersection = MiscUtils.intersectionLineRect(corner0, corner1, rect);
                    if (isSubIntersection) {
                        isIntersection = true;
                        break;
                    }
                }
            }
            if (isIntersection) {
                isConnected = false;
                break;
            }
        }
        return isConnected;
    }

    /** 生成向量图 */
    static createVectorMap(mapSize: cc.Size, graph: IGraph, map: IGrid[], targetPos: cc.Vec2) {
        let result: INearestPoint = {};

        let target_index = this.convertMapPosToIndex(mapSize, targetPos);
        let target_grid = map[target_index];
        for(let i = 0; i < map.length; i++) {
            var selected_grid = map[i];
            selected_grid.prev = null;
            var prev_grid = selected_grid;

            /** 排除地形 */
            if (selected_grid.flag == EnumFlagType.Terrain) {
                continue;
            }

            /** 排除目标点 */
            if (selected_grid.cost == 0) {
                continue;
            }

            /** 与目标直连通 */
            if (selected_grid.isConnectTarget) {
                prev_grid = target_grid;
            }
            
            /** 优先处理关键点 */
            if (prev_grid == selected_grid) {
                var neighbors = graph[selected_grid.index];
                for(var key in neighbors) {
                    let neighbor_cost = neighbors[key];
                    let neighor_index = Number(key);
                    var neighbor_grid = map[neighor_index];
                    var matched = false;
                    var cost_curr = neighbor_grid.cost + neighbor_cost;

                    if (cost_curr < prev_grid.cost) {
                        matched = true;
                    } else if (cost_curr == prev_grid.cost) {
                        if (neighbor_grid.cost < prev_grid.cost) {
                            matched = true;
                        }
                    }

                    if (matched) {
                        prev_grid = neighbor_grid;
                    }
                }
            }

            /** 非关键点网格 */
            if (prev_grid == selected_grid) {
                this.getNearestPoint(selected_grid, result);
                if (result.point != null) {
                    prev_grid = result.point;
                } else {
                    cc.warn("can't find nearest point", selected_grid.index);
                }
            }

            if (prev_grid != selected_grid) {
                selected_grid.prev = prev_grid;
            }
        }
    }

    /** 通过网格四方向, 生成连通图 */
    static createGraphByGrids(mapSize: cc.Size, map: IGrid[]): {[key: string]: {[key: string]: number}} {
        // MiscUtils.timeRecordStart('createGraphByGrids');
        let graph: {[key: string]: {[key: string]: number}} = {};
        for(let i = 0; i < map.length; i++) {
            let nest = {}
            let selected_grid = map[i];
            let selected_index = this.convertMapPosToIndex(mapSize, selected_grid);
            let neighbors = this.getAxisNeighbors(mapSize, selected_grid, Axis8);
            if (selected_grid.flag != EnumFlagType.Path) {
                continue;
            }

            for(let j = 0; j < neighbors.length; j++) {
                let neighbor_pos = neighbors[j];
                let neighbor_index = this.convertMapPosToIndex(mapSize, neighbor_pos);
                let neighbor_grid = map[neighbor_index];

                /** 排除地形 */
                if (neighbor_grid.flag == EnumFlagType.Terrain) {
                    continue;
                }

                /** 排除斜向夹角地形 */
                if (this.isNarrowCorner(mapSize, map, selected_grid, neighbor_grid)) {
                    continue;
                }

                nest[neighbor_index] = this.getGridDis(selected_grid, neighbor_grid);
            }
            graph[selected_index] = nest;
        }
        // MiscUtils.timeRecordEnd('createGraphByGrids');
        return graph;
    }

    /** 通过点&线段, 生成连通图 */
    static createGraphByPoints(mapSize: cc.Size, points: IGrid[], segments: ISegment[], map: IGrid[]): IGraph {
        // MiscUtils.timeRecordStart('createGraphByPoints');
        let graph = {};
        let rects = this.segments2rect(segments);
        
        /** 关键点加入图 */
        for(let i = 0; i < points.length; i++) {
            this.updateGraphPoint(mapSize, graph, points, rects, points[i]);
        }

        /** 网格点记录连通点 */
        for(let i = 0; i < map.length; i++) {
            let selected_grid = map[i];
            /** 排除地形 */
            if (selected_grid.flag == EnumFlagType.Terrain) {
                continue;
            }
            /** 排除关键点 */
            let selected_index = this.convertMapPosToIndex(mapSize, selected_grid);
            if (graph[selected_index]) {
                continue;
            }

            let near_points = [];
            let near_points_dis_cache = [];
            for(let j = 0; j < points.length; j++) {
                let point_grid = points[j];
                if (this.isConnect(rects, selected_grid, point_grid)) {
                    near_points.push(point_grid);
                    near_points_dis_cache.push(this.getGridDis(selected_grid, point_grid));
                }
            }
            if (near_points.length == 0) {
                cc.warn('#near_points = 0', selected_index);
            }
            selected_grid.nearPoints = near_points;
            selected_grid.nearPointsDisCache = near_points_dis_cache;
        }

        // MiscUtils.timeRecordEnd('createGraphByPoints');
        return graph;
    }

    //================================================ 控制点寻路特有
    /** 生成关键点 */
    static createKeypoints(mapSize: cc.Size, map: IGrid[]): IGrid[] {
        // MiscUtils.timeRecordStart('createKeypoints');
        let points = [];
        for(let i = 0; i < map.length; i++) {
            let blocks: IGrid[] = [];
            let selected_grid = map[i];
            var existIsolate = false;

            if (selected_grid.flag == EnumFlagType.Path) {
                let neighbors = this.getAxisNeighbors(mapSize, selected_grid, Axis8);
                let last_neighor = neighbors[neighbors.length-1];
                let last_neighor_index = this.convertMapPosToIndex(mapSize, last_neighor);
                let last_neighbor_grid = map[last_neighor_index];
                let nearCount = last_neighbor_grid.flag == EnumFlagType.Terrain? 1: 0;
                for(let j = 0; j < neighbors.length; j++) {
                    let neighor_index = this.convertMapPosToIndex(mapSize, neighbors[j]);
                    let neighbor_grid = map[neighor_index];
                    if (neighbor_grid.flag == EnumFlagType.Terrain) {
                        blocks.push(neighbor_grid);
                        nearCount++;
                    } else {
                        let dx = Math.abs(neighbor_grid.x - selected_grid.x);
                        let dy = Math.abs(neighbor_grid.y - selected_grid.y);
                        if (nearCount == 1 && (dx + dy) == 1) {
                            existIsolate = true;
                        }
                        nearCount = 0;
                    }
                }
            }
            
            if (existIsolate) {
                points.push(selected_grid);
                selected_grid.isKeyPoint = true;
            }
        }
        // MiscUtils.timeRecordEnd('createKeypoints');
        return points;
    }

    /** 生成阻挡线段 */
    static createSegments(mapSize: cc.Size, map: IGrid[]): ISegment[] {
        // MiscUtils.timeRecordStart('createSegments');
        let segments = [];
        let tmpMapPos = {x: 0, y: 0};

        /** 横向 */
        for(let j = 0; j < mapSize.height; j++) {
            for(let i = 0; i < mapSize.width; i++) {
                tmpMapPos.x = i;
                tmpMapPos.y = j;
                let seleted_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                let selected_grid = map[seleted_map_index];
                selected_grid.tmpUsed = false;
                
                if (selected_grid.flag == EnumFlagType.Terrain) {
                    let start_pos = selected_grid;
                    let end_pos = selected_grid;
                    for(let step = i+1; step < mapSize.width; step++, i++) {
                        tmpMapPos.x = step;
                        tmpMapPos.y = j;
                        let step_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                        let step_grid = map[step_map_index];
                        if (step_grid.flag == EnumFlagType.Terrain) {
                            selected_grid.tmpUsed = true;
                            step_grid.tmpUsed = true;
                            end_pos = step_grid;
                        } else {
                            break;
                        }
                    }

                    if (start_pos != end_pos) {
                        segments.push({
                            points: [start_pos, end_pos],
                            orient: EnumOrientation.Horizontal,
                        });
                    }
                }
            }
        }

        /** 纵向 */
        for(let i = 0; i < mapSize.width; i++) {
            for(let j = 0; j < mapSize.height; j++) {
                tmpMapPos.x = i;
                tmpMapPos.y = j;
                let seleted_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                let selected_grid = map[seleted_map_index];
                
                if (!selected_grid.tmpUsed && selected_grid.flag == EnumFlagType.Terrain) {
                    let start_pos = selected_grid;
                    let end_pos = selected_grid;
                    for(let step = j+1; step < mapSize.height; step++, j++) {
                        tmpMapPos.y = step;
                        tmpMapPos.x = i;
                        let step_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                        let step_grid = map[step_map_index];
                        if (step_grid.flag == EnumFlagType.Terrain && !step_grid.tmpUsed) {
                            selected_grid.tmpUsed = true;
                            step_grid.tmpUsed = true;
                            end_pos = step_grid;
                        } else {
                            break;
                        }
                    }

                    if (start_pos != end_pos) {
                        segments.push({
                            points: [start_pos, end_pos],
                            orient: EnumOrientation.Vertical,
                        });
                    }
                }
            }
        }
        
        // MiscUtils.timeRecordEnd('createSegments');
        return segments;
    }

    /** 更新图元链接状态 */
    static updateGraphPoint(mapSize: cc.Size, graph: IGraph, points: IGrid[], rects: cc.Rect[], newPoint: IPos) {
        let point0 = newPoint;
        for(let j = 0; j < points.length; j++) {
            let point1 = points[j];

            if (this.isConnect(rects, point0, point1)) {
                let map_index0 = this.convertMapPosToIndex(mapSize, point0);
                let map_index1 = this.convertMapPosToIndex(mapSize, point1);
                let dis = this.getGridDis(point0, point1);
                graph[map_index0] = graph[map_index0] || {};
                graph[map_index0][map_index1] = dis;
                graph[map_index1] = graph[map_index1] || {};
                graph[map_index1][map_index0] = dis;
            }
        }
        return graph;
    }

    /** 添加图元 */
    static addGraphElement(mapSize: cc.Size, graph: IGraph, map: IGrid[], points: IGrid[], segments: ISegment[], newPoint: IPos) {
        if (!newPoint) {
            return;
        }

        let new_index = this.convertMapPosToIndex(mapSize, newPoint);
        let new_grid = map[new_index];
        /** 排除关键点 */
        if (new_grid.isKeyPoint) {
            return;
        }

        let rects = this.segments2rect(segments);
        this.updateGraphPoint(mapSize, graph, points, rects, newPoint);
    }

    /** 删除图元 */
    static delGraphElement(mapSize: cc.Size, graph: IGraph, map: IGrid[], delPoint: IPos) {
        if (!delPoint) {
            return;
        }

        let del_index = this.convertMapPosToIndex(mapSize, delPoint);
        let del_grid = map[del_index];
        /** 排除关键点 */
        if (del_grid.isKeyPoint) {
            return;
        }

        delete graph[del_index];
        for(let key in graph) {
            let neighbors = graph[key];
            delete neighbors[del_index];
        }
    }
}
