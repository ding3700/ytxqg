/**
 * 悦通行广告位清理脚本
 *
 * 作用：拦截 v.110route.cn 的 tagad / tagadall 广告位配置接口响应，
 *       将所有广告位的 state/status 置为 0、sync/async 清空，
 *       使 App 判定为"无广告"从而跳过开屏、弹窗、Banner 等广告渲染。
 *
 * 兼容：Loon (http-response, requires-body=true)
 */

function main(body) {
    var json;
    try {
        json = JSON.parse(body);
    } catch (e) {
        return {};
    }
    if (!json || typeof json !== 'object' || !json.data) {
        return {};
    }

    function clearSlot(slot) {
        if (!slot || typeof slot !== 'object') return;
        slot.state = 0;
        slot.status = 0;
        slot.sync = "";
        slot.async = [];
    }

    var data = json.data;
    // tagad（单广告位）响应：data 本身含 platform 字段
    if (typeof data.platform !== 'undefined') {
        clearSlot(data);
    } else {
        // tagadall（批量广告位）响应：data 是 {广告位ID: 配置} 的 map
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                clearSlot(data[key]);
            }
        }
    }
    return { body: JSON.stringify(json) };
}

try {
    if (typeof $response !== 'undefined' && $response.body) {
        $done(main($response.body));
    } else {
        $done({});
    }
} catch (e) {
    $done({});
}
