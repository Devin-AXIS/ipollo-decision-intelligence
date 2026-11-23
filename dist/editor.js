"use strict";
(() => {
  // src/editor.ts
  var el = (id) => document.getElementById(id);
  var base = "/ipollo-decision-intelligence";
  var params = new URLSearchParams(location.search);
  var session = params.get("session") ?? "";
  var viewer = el("viewer");
  var versions = el("versions");
  var dialog = el("confirm");
  var button = (id) => el(id);
  var theme = params.get("theme") === "light" ? "light" : "dark";
  var selected = "";
  var title = "";
  var html = "";
  var generation = 0;
  var visible = true;
  var loading = false;
  var viewFailed = false;
  var rows = [];
  function message(text) {
    el("notice").textContent = text;
  }
  var errorText = (e) => e instanceof Error ? e.message : String(e);
  function controls() {
    button("publish").disabled = button("download").disabled = !html;
    el("toolbar").hidden = !rows.length;
    viewer.hidden = !html;
    el("empty").hidden = Boolean(rows.length);
  }
  async function api(action, id = "", payload) {
    const url = base + "/" + action + "?" + new URLSearchParams({ session, id, theme });
    const response = await fetch(url, payload === void 0 ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw Error(body.error || "\u8BF7\u6C42\u5931\u8D25 " + response.status);
    }
    return response;
  }
  async function show(row) {
    const request = ++generation;
    selected = row.id;
    title = row.title;
    versions.value = row.id;
    viewFailed = false;
    html = "";
    viewer.removeAttribute("srcdoc");
    controls();
    message("\u6B63\u5728\u6253\u5F00\u56FE\u8C31\u2026");
    try {
      const result = await (await api("view", row.id)).text();
      if (request !== generation) return;
      html = result;
      viewer.srcdoc = result;
      controls();
      message("");
    } catch (error) {
      if (request !== generation) return;
      viewFailed = true;
      message(errorText(error));
    }
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const next = await (await api("reports")).json();
      const followsLatest = !selected || selected === rows[0]?.id;
      const row = (followsLatest ? void 0 : next.find((item) => item.id === selected)) ?? next[0];
      if (JSON.stringify(rows) !== JSON.stringify(next)) {
        rows = next;
        versions.replaceChildren(...next.map((item) => new Option(item.title, item.id)));
      }
      if (row) {
        versions.value = row.id;
        if (row.id !== selected || viewFailed) await show(row);
      } else {
        if (selected) generation++;
        selected = "";
        html = "";
        viewer.removeAttribute("srcdoc");
        message("");
      }
      controls();
    } catch (error) {
      message(errorText(error));
    } finally {
      loading = false;
    }
  }
  versions.onchange = () => {
    const row = rows.find((item) => item.id === versions.value);
    if (row) void show(row);
  };
  button("refresh").onclick = () => void refresh();
  button("download").onclick = () => {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = title.replace(/[\\/:*?"<>|]/g, "_") + " \xB7 \u51B3\u7B56\u56FE\u8C31.html";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3e3);
  };
  var target;
  button("publish").onclick = () => {
    target = { id: selected, title };
    el("publicTitle").textContent = target.title;
    el("shareStatus").textContent = "";
    el("shareLink").hidden = true;
    button("submitPublish").hidden = false;
    dialog.showModal();
  };
  button("close").onclick = () => dialog.close();
  button("submitPublish").onclick = async () => {
    if (!target) return;
    const id = target.id;
    button("submitPublish").disabled = true;
    button("close").disabled = true;
    el("shareStatus").textContent = "\u6B63\u5728\u53D1\u5E03\u2026";
    try {
      const result = await (await api("publish", id, { confirm: id })).json();
      const link = el("shareLink");
      link.href = result.url;
      link.hidden = false;
      el("shareStatus").textContent = "\u5DF2\u751F\u6210\u8BBF\u5BA2\u94FE\u63A5";
      button("submitPublish").hidden = true;
    } catch (error) {
      el("shareStatus").textContent = errorText(error);
    } finally {
      button("submitPublish").disabled = false;
      button("close").disabled = false;
    }
  };
  dialog.addEventListener("cancel", (event) => {
    if (button("submitPublish").disabled) event.preventDefault();
  });
  document.body.classList.toggle("light", theme === "light");
  controls();
  window.addEventListener("message", (event) => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.type !== "decision-view") return;
    const next = event.data.theme === "light" ? "light" : "dark";
    const appeared = !visible && Boolean(event.data.visible);
    visible = Boolean(event.data.visible);
    if (next !== theme) {
      theme = next;
      document.body.classList.toggle("light", theme === "light");
      const row = rows.find((item) => item.id === selected);
      if (row) void show(row);
    }
    if (appeared) void refresh();
  });
  message("\u6B63\u5728\u52A0\u8F7D\u56FE\u8C31\u2026");
  void refresh();
  setInterval(() => {
    if (visible && !document.hidden && !dialog.open) void refresh();
  }, 6e3);
})();
