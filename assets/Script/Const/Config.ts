
export class Config {
    //====================== Game
    static DesignResolution: cc.Size = cc.size(1136, 640);

    //====================== Map
    static GridSize: cc.Size = cc.size(32, 32);
    static MaxUnitCount: number = 20;
}

export class Events {
    static Debug_Switch_Profiler: string = 'Debug_Switch_Profiler';
    static Debug_Switch_Units: string = 'Debug_Switch_Units';
    static Debug_Switch_VectorMap: string = 'Debug_Switch_VectorMap';
}

//================================================ 
export interface IPos {
    x: number,
    y: number,
}

export interface IGrid {
    x: number,
    y: number,
    flag: number,
    cost?: number,
    prev?: IGrid,
}

export enum EnumFlagType {
    Path = 0,
    Terrain = 1,
}