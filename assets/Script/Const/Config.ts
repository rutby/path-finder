
export class Config {
    //====================== 
    static DesignResolution: cc.Size = cc.size(1136, 640);

    //====================== 
    static GridSize: cc.Size = cc.size(32, 32);
}

export class Events {
    static Debug_Switch_Profiler: string = 'Debug_Switch_Profiler';
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
}

export enum EnumFlagType {
    Terrain = 1,
}