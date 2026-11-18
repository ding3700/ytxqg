/**
 * 悦通行广告位「极速应答」脚本
 *
 * 作用：在请求阶段就直接返回一个合法的"无广告"配置，完全不走上游服务器。
 *       这样 App 不需要等待远端响应/超时，开屏不会白屏空等，会立刻走"无广告"分支。
 *
 * 背景：悦通行 tagad / tagadall 的响应体是 base64 包裹的 JSON，
 *       用 REJECT 直接掐断会让 App 一直等连接超时 -> 开屏白屏且停留很久。
 *
 * 兼容：Loon (http-request, requires-body=true)
 */

var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

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

function bytesToStr(bytes) {
    var s = "", i = 0;
    while (i < bytes.length) {
        var b = bytes[i++];
        if (b < 0x80) {
            s += String.fromCharCode(b);
        } else if (b >= 0xC0 && b < 0xE0) {
            var b2 = bytes[i++];
            s += String.fromCharCode(((b & 0x1F) << 6) | (b2 & 0x3F));
        } else if (b >= 0xE0 && b < 0xF0) {
            var b2 = bytes[i++], b3 = bytes[i++];
            s += String.fromCharCode(((b & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F));
        } else if (b >= 0xF0) {
            var b2 = bytes[i++], b3 = bytes[i++], b4 = bytes[i++];
            var cp = (((b & 0x07) << 18) | ((b2 & 0x3F) << 12) | ((b3 & 0x3F) << 6) | (b4 & 0x3F)) - 0x10000;
            s += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
        }
    }
    return s;
}

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

function bytesToB64(bytes) {
    var out = "", i = 0;
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

/* 从请求体里取出广告位 ID 列表，支持 base64 包裹的表单或 JSON */
function extractIds(raw) {
    var ids = [];
    if (!raw) return ids;
    var text = String(raw);
    var compact = text.replace(/\s+/g, "");
    // 先尝试整体 base64
    if (compact.charAt(0) !== "{" && compact.charAt(0) !== "i" && compact.charAt(0) !== "d") {
        try { text = bytesToStr(b64ToBytes(compact)); } catch (e) {}
    }
    text = text.trim();
    if (text.charAt(0) === "{") {
        try {
            var obj = JSON.parse(text);
            if (obj && obj.id) text = String(obj.id);
        } catch (e) { return ids; }
    } else {
        // 表单形式：id=31031%2C31048&phone=...
        var parts = text.split("&");
        for (var i = 0; i < parts.length; i++) {
            var kv = parts[i].split("=");
            if (kv[0] === "id") {
                try { text = decodeURIComponent(kv[1] || ""); } catch (e) { text = kv[1] || ""; }
                break;
            }
        }
        if (text.indexOf("&") >= 0) return ids;
    }
    var arr = String(text).split(",");
    for (var j = 0; j < arr.length; j++) {
        var v = arr[j].trim();
        if (v && /^\d+$/.test(v)) ids.push(v);
    }
    return ids;
}

function buildNoAdBody(ids) {
    var data = {};
    for (var i = 0; i < ids.length; i++) {
        data[ids[i]] = {
            platform: 4,
            status: 0,
            state: 0,
            sync: "",
            async: "",
            mode: 0
        };
    }
    return JSON.stringify({ code: 0, msg: "成功", data: data });
}

try {
    var req = typeof $request !== "undefined" ? $request : null;
    var ids = req ? extractIds(req.body) : [];
    var payload = bytesToB64(strToBytes(buildNoAdBody(ids)));
    $done({
        response: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: payload
        }
    });
} catch (e) {
    $done({});
}
