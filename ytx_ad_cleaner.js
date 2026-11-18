/**
 * 悦通行广告位清理脚本 v2
 *
 * 作用：拦截 v.110route.cn 的 tagad / tagadall 广告位配置接口响应，
 *       将所有广告位置为"无广告"，使 App 跳过开屏、弹窗、Banner 等广告渲染。
 *
 * 关键点：
 *   悦通行该接口的响应体是「base64 包裹的 JSON」，少数情况为明文 JSON。
 *   本脚本两种都能处理：能解码就解码改完再按原格式写回。
 *
 * 兼容：Loon (http-response, requires-body=true)
 */

var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/* ---------- base64 -> 字节 ---------- */
function b64ToBytes(s) {
    s = s.replace(/[^A-Za-z0-9+/]/g, "");
    var out = [];
    var i = 0;
    while (i < s.length) {
        var ch1 = s.charAt(i++);
        var ch2 = s.charAt(i++);
        var ch3 = s.charAt(i++);
        var ch4 = s.charAt(i++);
        var c1 = B64.indexOf(ch1);
        var c2 = ch2 ? B64.indexOf(ch2) : -1;
        var c3 = ch3 ? B64.indexOf(ch3) : -1;
        var c4 = ch4 ? B64.indexOf(ch4) : -1;
        if (c1 < 0 || c2 < 0) break;
        out.push((c1 << 2) | (c2 >> 4));
        if (c3 >= 0) out.push(((c2 & 15) << 4) | (c3 >> 2));
        if (c4 >= 0) out.push(((c3 & 3) << 6) | c4);
    }
    return out;
}

/* ---------- 字节 -> 字符串(UTF-8) ---------- */
function bytesToStr(bytes) {
    var s = "";
    var i = 0;
    while (i < bytes.length) {
        var b = bytes[i++];
        if (b < 0x80) {
            s += String.fromCharCode(b);
        } else if (b >= 0xC0 && b < 0xE0) {
            var b2 = bytes[i++];
            s += String.fromCharCode(((b & 0x1F) << 6) | (b2 & 0x3F));
        } else if (b >= 0xE0 && b < 0xF0) {
            var b2 = bytes[i++];
            var b3 = bytes[i++];
            s += String.fromCharCode(((b & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F));
        } else if (b >= 0xF0) {
            var b2 = bytes[i++];
            var b3 = bytes[i++];
            var b4 = bytes[i++];
            var cp = (((b & 0x07) << 18) | ((b2 & 0x3F) << 12) | ((b3 & 0x3F) << 6) | (b4 & 0x3F)) - 0x10000;
            s += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
        }
    }
    return s;
}

/* ---------- 字符串(UTF-8) -> 字节 ---------- */
function strToBytes(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c < 0x80) {
            out.push(c);
        } else if (c < 0x800) {
            out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
        } else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
            var lo = s.charCodeAt(i + 1);
            var cp = 0x10000 + ((c - 0xD800) << 10) + (lo - 0xDC00);
            out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
            i++;
        } else {
            out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
        }
    }
    return out;
}

/* ---------- 字节 -> base64 ---------- */
function bytesToB64(bytes) {
    var out = "";
    var i = 0;
    while (i < bytes.length) {
        var b1 = bytes[i++];
        var b2 = i < bytes.length ? bytes[i++] : -1;
        var b3 = i < bytes.length ? bytes[i++] : -1;
        out += B64.charAt(b1 >> 2);
        out += B64.charAt(((b1 & 3) << 4) | (b2 >= 0 ? b2 >> 4 : 0));
        out += b2 >= 0 ? B64.charAt(((b2 & 15) << 2) | (b3 >= 0 ? b3 >> 6 : 0)) : "=";
        out += b3 >= 0 ? B64.charAt(b3 & 63) : "=";
    }
    return out;
}

/* ---------- 判断并取出真正的 JSON 文本 ---------- */
function unwrap(body) {
    var raw = body;
    var trimmed = body.replace(/\s+/g, "");
    var first = trimmed.charAt(0);
    if (first === "{" || first === "[") {
        return { text: body, base64: false };
    }
    var decoded;
    try {
        decoded = bytesToStr(b64ToBytes(trimmed));
    } catch (e) {
        return null;
    }
    decoded = decoded.replace(/^\uFEFF/, "").trim();
    if (decoded.charAt(0) === "{") {
        return { text: decoded, base64: true };
    }
    return null;
}

/* ---------- 把一个广告位清成"无广告" ---------- */
function clearSlot(slot) {
    if (!slot || typeof slot !== "object") return;
    slot.state = 0;
    slot.status = 0;
    slot.mode = 0;
    slot.sync = "";
    slot.async = "";
}

/* ---------- 主逻辑 ---------- */
function main(body) {
    var w = unwrap(body);
    if (!w) return null;

    var json;
    try {
        json = JSON.parse(w.text);
    } catch (e) {
        return null;
    }
    if (!json || typeof json !== "object") return null;

    var data = json.data;
    if (typeof data === "string") {
        try { data = json.data = JSON.parse(data); } catch (e) { return null; }
    }
    if (!data || typeof data !== "object") {
        // 有些版本直接把 {广告位ID: {...}} 放在根上
        data = json;
    }

    if (typeof data.platform !== "undefined" || typeof data.state !== "undefined") {
        // 单个广告位
        clearSlot(data);
    } else {
        // 批量：{广告位ID: 配置}
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                var slot = data[key];
                if (typeof slot === "string") {
                    try { slot = data[key] = JSON.parse(slot); } catch (e) { continue; }
                }
                clearSlot(slot);
            }
        }
    }

    var out = JSON.stringify(json);
    if (w.base64) out = bytesToB64(strToBytes(out));
    return { body: out };
}

try {
    if (typeof $response !== "undefined" && $response.body) {
        var r = main($response.body);
        if (r) {
            $done(r);
        } else {
            $done({});
        }
    } else {
        $done({});
    }
} catch (e) {
    $done({});
}
