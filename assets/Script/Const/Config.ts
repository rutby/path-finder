
export class Config {
    //====================== Game
    static DesignResolution: cc.Size = cc.size(1136, 640);

    //====================== Map
    static GridSize: cc.Size = cc.size(32, 32);
    static MaxUnitCount: number = 30;
    static EnableOptimize: boolean = true;
}

export class Events {
    static Debug_Switch_Profiler: string = 'Debug_Switch_Profiler';
    static Debug_Switch_Units: string = 'Debug_Switch_Units';
    static Debug_Switch_VectorMap: string = 'Debug_Switch_VectorMap';
    static Debug_Switch_KeyPoint: string = 'Debug_Switch_keyPoint';
    static Debug_Switch_Index: string = 'Debug_Switch_Index';
    static Debug_Switch_Optmize: string = 'Debug_Switch_Optmize';
    static Debug_Switch_Help: string = 'Debug_Switch_Help';
}

//================================================ 
export interface IPos {
    x: number,
    y: number,
}

export interface IGrid {v
    x: number,
    y: number,
    index: number,
    flag: number,
    cost?: number,
    prev?: IGrid,
    /** 是否是关键点 */
    isKeyPoint?: boolean,
    /** 临近关键点 */
    nearPoints?: IGrid[],
    /** 临近关键点距离 */
    nearPointsDisCache?: number[],
    /** 是否与目标点连通 */
    isConnectTarget?: boolean,

    /** 部分算法内部的的临时变量 */
    tmpUsed?: boolean,
}

export enum EnumFlagType {
    Path = 0,
    Terrain = 1,
}

export interface IMoveUnit {
    node: cc.Node,
    isArrived?: boolean,
    ended?: boolean,
    dstMapPos?: IPos,
    curMapPos?: IPos,
}

export enum EnumOrientation {
    Horizontal,
    Vertical,
}

export interface ISegment {
    points: IGrid[], 
    orient: EnumOrientation,
}

export interface INode {
    index: number,
    cost: number,
}