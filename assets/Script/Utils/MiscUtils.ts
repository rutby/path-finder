export class MiscUtils {
    private static _recordStartTs: any = {};
    static timeRecordStart(tag: string) {
        this._recordStartTs[tag] = new Date().getTime();
    }

    static timeRecordEnd(tag: string, desc?: string, clear?: boolean) {
        if (!this._recordStartTs[tag]) {
            console.warn("use timeRecordStart before", tag);
            return;
        }
        desc = desc || '';

        var last = this._recordStartTs[tag];
        var curr = new Date().getTime();
        if (clear) {
            delete this._recordStartTs[tag];
        }
        console.log('[develop] ========', '[TimeRecord]', tag, desc, curr - last);
    }

    static randomRangeInt(min: number, max: number) {
        var num = (Math.random() * (max - min)) + min;
        return Math.round(num);
    }

    static vec2deg(vec: cc.Vec2) {
        var degree = cc.misc.radiansToDegrees(cc.v2(vec).signAngle(cc.v2(1, 0)));
        return degree <= 0? -degree : 360 - degree;
    }

    // static lerpPath()
}
