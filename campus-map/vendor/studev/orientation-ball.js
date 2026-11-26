/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * 来源：NJUPT-CS-StuDev/studev，src/campus/map/ball.ts
 * 固定提交：cf85eec1182583a030b57d09073c27e67c9298b9
 * 原始源码及完整许可证见同目录 ball.ts.source.txt、LICENSE.txt。
 * 上游 package.json 未声明 author；此处不推定个人作者。
 * 修改日期：2026-11-20。
 * 修改说明：移除 TypeScript 类型与模块导出；用经典脚本 IIFE 封装，
 * 通过 window.CampusOrientationBall 提供原算法与 RADIUS；增加中文说明。
 * 本修改版按 AGPL-3.0-or-later 发布，不提供任何担保。
 */
(function () {
    'use strict';

    // 小球随地图方位和俯仰转动；仅绘制赤道可见半圈与始终可见的北向标记。
    const rad = Math.PI / 180;

    // 地图坐标（东、北、上）转换为观察坐标（右、上、朝向观察者）。
    const view = (bearing, pitch) => {
        const [sb, cb, sp, cp] = [Math.sin(bearing * rad), Math.cos(bearing * rad), Math.sin(pitch * rad), Math.cos(pitch * rad)];
        return ([x, y, z]) => {
            const [rx, ry] = [x * cb - y * sb, x * sb + y * cb];
            return [rx, ry * cp + z * sp, -ry * sp + z * cp];
        };
    };
    const onSphere = (lon, lat) => [Math.cos(lat * rad) * Math.sin(lon * rad), Math.cos(lat * rad) * Math.cos(lon * rad), Math.sin(lat * rad)];
    const at = (x, y) => `${(x * RADIUS).toFixed(2)} ${(-y * RADIUS).toFixed(2)}`;

    // 建议 viewBox 范围 -22 至 22，以给转向箭头留出空间。
    const RADIUS = 15;

    // 输入角度制方位与俯仰，返回可直接用于 SVG path 的 ring 和 north。
    function orientationBall(bearing, pitch) {
        const project = view(bearing, pitch);
        let ring = '';
        let pen = false;
        for (let lon = 0; lon <= 360; lon += 4) {
            const [x, y, z] = project(onSphere(lon, 0));
            if (z < 0) { pen = false; continue; }
            ring += `${pen ? 'L' : 'M'}${at(x, y)}`;
            pen = true;
        }
        // 北向标记固定在球体边缘，不会因俯仰而藏到背面。
        const [dx, dy] = [-Math.sin(bearing * rad), Math.cos(bearing * rad)];
        const tip = (r, side) => at((dx * r - dy * side) / RADIUS, (dy * r + dx * side) / RADIUS);
        return { ring, north: `M${tip(RADIUS + 5, 0)}L${tip(RADIUS - 1.5, 3.4)}L${tip(RADIUS - 1.5, -3.4)}Z` };
    }

    window.CampusOrientationBall = { orientationBall, RADIUS };
})();
