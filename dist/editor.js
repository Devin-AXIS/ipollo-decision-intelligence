"use strict";
(() => {
  // node_modules/fflate/esm/browser.js
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u8([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start2) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start2 += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
      for (var j = b[i]; j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0; i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var hMap = (function(cd, mb, r) {
    var s = cd.length;
    var i = 0;
    var l = new u16(mb);
    for (; i < s; ++i) {
      if (cd[i])
        ++l[cd[i] - 1];
    }
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = le[i - 1] + l[i - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          var sv = i << 4 | cd[i];
          var r_1 = mb - cd[i];
          var v = le[cd[i] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
        }
      }
    }
    return co;
  });
  var flt = new u8(288);
  for (i = 0; i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144; i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256; i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280; i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u8(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
  var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
  var max = function(a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
      if (a[i] > m)
        m = a[i];
    }
    return m;
  };
  var bits = function(d, p, m) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
  };
  var bits16 = function(d, p) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
  };
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var inflt = function(dat, st, buf, dict) {
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
      return buf || new u8(0);
    var noBuf = !buf;
    var resize = noBuf || st.i != 2;
    var noSt = st.i;
    if (noBuf)
      buf = new u8(sl * 3);
    var cbuf = function(l2) {
      var bl = buf.length;
      if (l2 > bl) {
        var nbuf = new u8(Math.max(bl * 2, l2));
        nbuf.set(buf);
        buf = nbuf;
      }
    };
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    var tbts = sl * 8;
    do {
      if (!lm) {
        final = bits(dat, pos, 1);
        var type = bits(dat, pos + 1, 3);
        pos += 3;
        if (!type) {
          var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
          if (t > sl) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + l);
          buf.set(dat.subarray(s, t), bt);
          st.b = bt += l, st.p = pos = t * 8, st.f = final;
          continue;
        } else if (type == 1)
          lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
        else if (type == 2) {
          var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
          var tl = hLit + bits(dat, pos + 5, 31) + 1;
          pos += 14;
          var ldt = new u8(tl);
          var clt = new u8(19);
          for (var i = 0; i < hcLen; ++i) {
            clt[clim[i]] = bits(dat, pos + i * 3, 7);
          }
          pos += hcLen * 3;
          var clb = max(clt), clbmsk = (1 << clb) - 1;
          var clm = hMap(clt, clb, 1);
          for (var i = 0; i < tl; ) {
            var r = clm[bits(dat, pos, clbmsk)];
            pos += r & 15;
            var s = r >> 4;
            if (s < 16) {
              ldt[i++] = s;
            } else {
              var c = 0, n = 0;
              if (s == 16)
                n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
              else if (s == 17)
                n = 3 + bits(dat, pos, 7), pos += 3;
              else if (s == 18)
                n = 11 + bits(dat, pos, 127), pos += 7;
              while (n--)
                ldt[i++] = c;
            }
          }
          var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
          lbt = max(lt);
          dbt = max(dt);
          lm = hMap(lt, lbt, 1);
          dm = hMap(dt, dbt, 1);
        } else
          err(1);
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
      }
      if (resize)
        cbuf(bt + 131072);
      var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
      var lpos = pos;
      for (; ; lpos = pos) {
        var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
        pos += c & 15;
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (!c)
          err(2);
        if (sym < 256)
          buf[bt++] = sym;
        else if (sym == 256) {
          lpos = pos, lm = null;
          break;
        } else {
          var add = sym - 254;
          if (sym > 264) {
            var i = sym - 257, b = fleb[i];
            add = bits(dat, pos, (1 << b) - 1) + fl[i];
            pos += b;
          }
          var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
          if (!d)
            err(3);
          pos += d & 15;
          var dt = fd[dsym];
          if (dsym > 3) {
            var b = fdeb[dsym];
            dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
          }
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + 131072);
          var end = bt + add;
          if (bt < dt) {
            var shift = dl - dt, dend = Math.min(dt, end);
            if (shift + bt < 0)
              err(3);
            for (; bt < dend; ++bt)
              buf[bt] = dict[shift + bt];
          }
          for (; bt < end; ++bt)
            buf[bt] = buf[bt - dt];
        }
      }
      st.l = lm, st.p = lpos, st.b = bt, st.f = final;
      if (lm)
        final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
  };
  var et = /* @__PURE__ */ new u8(0);
  var b2 = function(d, b) {
    return d[b] | d[b + 1] << 8;
  };
  var b4 = function(d, b) {
    return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
  };
  var b8 = function(d, b) {
    return b4(d, b) + b4(d, b + 4) * 4294967296;
  };
  function inflateSync(data, opts) {
    return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
  }
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }
  var dutf8 = function(d) {
    for (var r = "", i = 0; ; ) {
      var c = d[i++];
      var eb = (c > 127) + (c > 223) + (c > 239);
      if (i + eb > d.length)
        return { s: r, r: slc(d, i - 1) };
      if (!eb)
        r += String.fromCharCode(c);
      else if (eb == 3) {
        c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
      } else if (eb & 1)
        r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
      else
        r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
    }
  };
  function strFromU8(dat, latin1) {
    if (latin1) {
      var r = "";
      for (var i = 0; i < dat.length; i += 16384)
        r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
      return r;
    } else if (td) {
      return td.decode(dat);
    } else {
      var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
      if (r.length)
        err(8);
      return s;
    }
  }
  var slzh = function(d, b) {
    return b + 30 + b2(d, b + 26) + b2(d, b + 28);
  };
  var zh = function(d, b, z) {
    var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
    var _a2 = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a2[0], su = _a2[1], off = _a2[2];
    return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
  };
  var z64e = function(d, b) {
    for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
      ;
    return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
  };
  function unzipSync(data, opts) {
    var files = {};
    var e = data.length - 22;
    for (; b4(data, e) != 101010256; --e) {
      if (!e || data.length - e > 65558)
        err(13);
    }
    ;
    var c = b2(data, e + 8);
    if (!c)
      return {};
    var o = b4(data, e + 16);
    var z = o == 4294967295 || c == 65535;
    if (z) {
      var ze = b4(data, e - 12);
      z = b4(data, ze) == 101075792;
      if (z) {
        c = b4(data, ze + 32);
        o = b4(data, ze + 48);
      }
    }
    var fltr = opts && opts.filter;
    for (var i = 0; i < c; ++i) {
      var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
      o = no;
      if (!fltr || fltr({
        name: fn,
        size: sc,
        originalSize: su,
        compression: c_2
      })) {
        if (!c_2)
          files[fn] = slc(data, b, b + sc);
        else if (c_2 == 8)
          files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
        else
          err(14, "unknown compression type " + c_2);
      }
    }
    return files;
  }

  // src/slides.ts
  function extractSlides(bytes) {
    if (bytes.length > 20 * 1024 * 1024) throw Error("PPTX \u8D85\u8FC7 20 MB");
    let expanded = 0;
    const files = unzipSync(bytes, { filter: (entry) => {
      if (!/^ppt\/(presentation\.xml|_rels\/presentation\.xml\.rels|slides\/slide\d+\.xml)$/.test(entry.name)) return false;
      expanded += entry.originalSize;
      if (entry.originalSize > 4 * 1024 * 1024 || expanded > 24 * 1024 * 1024) throw Error("\u5E7B\u706F\u7247\u6587\u5B57\u8D85\u51FA\u5BFC\u5165\u8303\u56F4");
      return true;
    } });
    const xml = (path) => {
      if (!files[path]) throw Error("PPTX \u7F3A\u5C11\u5E7B\u706F\u7247\u7ED3\u6784");
      const doc = new DOMParser().parseFromString(strFromU8(files[path]), "application/xml");
      if (doc.querySelector("parsererror")) throw Error("\u5E7B\u706F\u7247 XML \u65E0\u6CD5\u8BFB\u53D6");
      return doc;
    };
    const rels = new Map(Array.from(xml("ppt/_rels/presentation.xml.rels").getElementsByTagNameNS("*", "Relationship")).map((r) => [r.getAttribute("Id"), r.getAttribute("Target") || ""]));
    const ordered = Array.from(xml("ppt/presentation.xml").getElementsByTagNameNS("*", "sldId"));
    if (ordered.length > 200) throw Error("\u4E00\u6B21\u6700\u591A\u5BFC\u5165 200 \u9875");
    const slides2 = ordered.map((el2, i) => {
      const relation = Array.from(el2.attributes).find((a) => a.localName === "id" && a.namespaceURI?.endsWith("/relationships"));
      const target = rels.get(relation?.value || "") || "";
      const path = target.startsWith("/ppt/") ? target.slice(1) : "ppt/" + target.replace(/^\.\//, "");
      if (!/^ppt\/slides\/slide\d+\.xml$/.test(path)) throw Error("\u65E0\u6CD5\u89E3\u6790\u5E7B\u706F\u7247\u987A\u5E8F");
      const paragraphs = Array.from(xml(path).getElementsByTagNameNS("*", "p")).map((p) => Array.from(p.getElementsByTagNameNS("*", "t")).map((t) => t.textContent).join("")).filter(Boolean);
      return paragraphs.length ? "\u7B2C " + (i + 1) + " \u9875\n" + paragraphs.join("\n") : "";
    });
    const text = slides2.filter(Boolean).join("\n\n");
    if (!text) throw Error("\u8FD9\u4EFD PPTX \u6CA1\u6709\u53EF\u63D0\u53D6\u7684\u6587\u5B57\u3002\u8BF7\u5728\u5DE6\u4FA7\u8F93\u5165\u95EE\u9898\u6216\u7C98\u8D34\u56FE\u4E2D\u6587\u5B57\u3002");
    if (text.length > 64e3) throw Error("\u6587\u5B57\u8D85\u8FC7 64,000 \u5B57\u7B26\uFF0C\u8BF7\u5206\u62C6\u6750\u6599\u540E\u5BFC\u5165\u3002");
    return { text, pages: ordered.length, empty: slides2.filter((s) => !s).length };
  }

  // src/editor.ts
  var el = (id) => document.getElementById(id);
  var base = "/ipollo-decision-intelligence";
  var space = el("workspace");
  var topic = el("topic");
  var viewer = el("viewer");
  var dialog = el("confirm");
  var selected = "";
  var title = "\u50A8\u80FD\u4EA7\u4E1A\u94FE \xB7 \u793A\u4F8B";
  var slides = "";
  var html = "";
  var pending = "";
  var busy = false;
  var fileGeneration = 0;
  var viewGeneration = 0;
  var theme = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  var button = (id) => el(id);
  function message(value) {
    el("notice").textContent = value;
  }
  var errorText = (e) => e instanceof Error ? e.message : String(e);
  function controls() {
    button("generate").disabled = busy || !space.value || !(topic.value.trim() || slides);
    button("publish").disabled = busy || !selected || !html;
    button("download").disabled = !html;
    space.disabled = busy;
    el("import").disabled = busy || !space.value;
  }
  function url(action, id = "") {
    return base + "/" + action + "?" + new URLSearchParams({ workspace: space.value, id, theme });
  }
  async function api(action, id = "", payload) {
    const response = await fetch(url(action, id), payload === void 0 ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw Error(body.error || "\u8BF7\u6C42\u5931\u8D25 " + response.status);
    }
    return response;
  }
  async function show(id = "", name = "\u50A8\u80FD\u4EA7\u4E1A\u94FE \xB7 \u793A\u4F8B") {
    const generation = ++viewGeneration;
    selected = id;
    title = name;
    html = "";
    viewer.srcdoc = "";
    el("current").textContent = title;
    controls();
    const result = await (await api(id ? "view" : "example", id)).text();
    if (generation !== viewGeneration) return;
    html = result;
    viewer.srcdoc = html;
    controls();
    for (const b of el("reports").querySelectorAll("button")) b.setAttribute("aria-current", String(b.dataset.id === id));
  }
  async function list() {
    const workspace = space.value;
    if (!workspace) return;
    const rows = await (await api("reports")).json();
    if (workspace !== space.value) return;
    const target = el("reports");
    target.replaceChildren();
    for (const r of rows) {
      const b = document.createElement("button"), small = document.createElement("small");
      b.textContent = r.title;
      b.dataset.id = r.id;
      b.setAttribute("aria-current", String(r.id === selected));
      small.textContent = r.state === "ready" ? "\u53EF\u8BB2\u89E3" : r.state === "failed" ? "\u63D0\u4EA4\u5931\u8D25" : r.state === "attention" ? "\u4F1A\u8BDD\u5DF2\u7ED3\u675F\uFF0C\u5C1A\u672A\u4FDD\u5B58\u56FE\u8C31" : "\u7B49\u5F85\u8C03\u67E5\u4F1A\u8BDD\u4FDD\u5B58";
      b.append(small);
      target.append(b);
      b.onclick = () => r.state === "ready" ? void show(r.id, r.title).catch((e) => message(errorText(e))) : message("\u53EF\u5728 DSH \u5BF9\u8BDD\u4E2D\u67E5\u770B\u8C03\u67E5\u8FDB\u5EA6\u3002\u4F1A\u8BDD " + r.session);
      if (r.id === pending && r.state === "attention") {
        pending = "";
        message("\u8BF7\u6253\u5F00 DSH \u8C03\u67E5\u4F1A\u8BDD\u67E5\u770B\u6A21\u578B\u6216\u4FDD\u5B58\u95EE\u9898\uFF0C\u5B8C\u6210\u540E\u70B9\u5237\u65B0\u3002");
      }
      if (r.id === pending && r.state === "ready") {
        pending = "";
        await show(r.id, r.title);
        message("\u8C03\u67E5\u5DF2\u4FDD\u5B58\u3002");
      }
    }
    if (!rows.length) target.textContent = "\u5C1A\u65E0\u5DF2\u4FDD\u5B58\u7684\u8C03\u67E5\u3002";
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    controls();
    try {
      await action();
    } catch (e) {
      message(errorText(e));
    } finally {
      busy = false;
      controls();
    }
  }
  topic.oninput = controls;
  button("clearFile").onclick = () => {
    fileGeneration++;
    slides = "";
    el("fileinfo").textContent = "";
    el("ppt").value = "";
    button("clearFile").hidden = true;
    controls();
  };
  el("ppt").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const version = ++fileGeneration;
    slides = "";
    controls();
    button("clearFile").hidden = false;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error("PPTX \u8D85\u8FC7 20 MB");
      const data = extractSlides(new Uint8Array(await file.arrayBuffer()));
      if (version !== fileGeneration) return;
      slides = data.text;
      el("fileinfo").textContent = file.name + " \xB7 " + data.pages + " \u9875" + (data.empty ? " \xB7 " + data.empty + " \u9875\u65E0\u6587\u5B57" : "");
    } catch (e2) {
      if (version === fileGeneration) el("fileinfo").textContent = errorText(e2);
    }
    controls();
  };
  button("generate").onclick = () => void run(async () => {
    message("\u6B63\u5728\u63D0\u4EA4\u7ED9\u5DE5\u4F5C\u533A AI\u2026");
    const r = await (await api("investigate", "", { topic: topic.value.trim(), slides })).json();
    pending = r.id;
    message("\u8C03\u67E5\u5DF2\u8FDB\u5165 DSH \u4F1A\u8BDD\u3002\u5B8C\u6210\u540E\u56FE\u8C31\u4F1A\u81EA\u52A8\u6253\u5F00\u3002");
    await list();
  });
  el("import").onchange = (e) => void run(async () => {
    const input = e.target, file = input.files?.[0];
    if (!file) return;
    input.value = "";
    if (file.size > 2e6) throw Error("\u56FE\u8C31\u8D85\u8FC7 2 MB");
    const report = JSON.parse(await file.text());
    const result = await (await api("import", "", report)).json();
    await list();
    await show(result.id, report.title);
    message("\u5DF2\u4FDD\u5B58\u5230\u5F53\u524D\u5DE5\u4F5C\u533A\u3002");
  });
  space.onchange = () => {
    pending = "";
    el("reports").replaceChildren();
    message("");
    void show().catch((e) => message(errorText(e)));
    void list().catch((e) => message(errorText(e)));
    controls();
  };
  button("refresh").onclick = () => void list().catch((e) => message(errorText(e)));
  button("sample").onclick = () => void show().catch((e) => message(errorText(e)));
  button("toggle").onclick = () => {
    const closed = el("shell").classList.toggle("collapsed");
    button("toggle").textContent = closed ? "\u5C55\u5F00\u8F93\u5165" : "\u6536\u8D77\u8F93\u5165";
    button("toggle").setAttribute("aria-expanded", String(!closed));
  };
  button("download").onclick = () => {
    if (!html) return;
    const u = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = title.replace(/[\\/:*?"<>|]/g, "_") + " \xB7 \u6253\u5F00\u8BB2\u89E3.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 3e3);
  };
  button("publish").onclick = () => {
    el("publicTitle").textContent = title;
    el("shareStatus").textContent = "";
    el("shareLink").hidden = true;
    button("submitPublish").hidden = false;
    dialog.showModal();
  };
  button("close").onclick = () => dialog.close();
  button("submitPublish").onclick = async () => {
    const id = selected;
    button("submitPublish").disabled = true;
    el("shareStatus").textContent = "\u6B63\u5728\u53D1\u5E03\u9009\u5B9A\u7248\u672C\u2026";
    try {
      const r = await (await api("publish", id, { confirm: id })).json();
      const a = el("shareLink");
      a.href = r.url;
      a.textContent = r.url;
      a.hidden = false;
      el("shareStatus").textContent = "\u8BBF\u5BA2\u94FE\u63A5";
      button("submitPublish").hidden = true;
    } catch (e) {
      el("shareStatus").textContent = errorText(e);
    } finally {
      button("submitPublish").disabled = false;
    }
  };
  function applyTheme(value) {
    theme = value;
    document.body.classList.toggle("light", theme === "light");
    if (html) void show(selected, title).catch((e) => message(errorText(e)));
  }
  window.addEventListener("message", (e) => {
    if (e.source === parent && e.origin === location.origin && e.data?.type === "decision-theme") applyTheme(e.data.theme === "light" ? "light" : "dark");
  });
  async function start() {
    applyTheme(theme);
    await show();
    const rows = await (await api("workspaces")).json();
    rows.forEach((r) => space.add(new Option(r.title, r.id)));
    if (rows.length) {
      space.value = rows[0].id;
      await list();
    } else message("\u5148\u5728 DSH \u521B\u5EFA\u5DE5\u4F5C\u533A\uFF0C\u5373\u53EF\u5F00\u59CB\u8C03\u67E5\u3002");
  }
  start().catch((e) => message(errorText(e))).finally(controls);
  var polling = false;
  setInterval(async () => {
    if (polling || busy || document.hidden || !space.value || !pending && !el("reports").textContent?.includes("\u7B49\u5F85\u8C03\u67E5\u4F1A\u8BDD\u4FDD\u5B58")) return;
    polling = true;
    try {
      await list();
    } catch (e) {
      message(errorText(e));
    } finally {
      polling = false;
    }
  }, 8e3);
})();
