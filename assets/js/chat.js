/* ============================================================
   amytorontofuneral.ca — AI 在线客服挂件（自建 Claude）
   依赖：assets/js/lead.js（读取 window.AMY_CONFIG.workerUrl）
   后端：worker/ 目录的 Cloudflare Worker（/chat 端点）
   workerUrl 未配置时挂件不显示。
   workerUrl 设为 "demo" 时进入演示模式：不调用后端，
   用本地脚本模拟 AI 回复（用于给客户演示，上线前必须换成真实地址）。
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.AMY_CONFIG || {};
  if (!CFG.workerUrl) return;
  var DEMO = CFG.workerUrl === "demo";

  var zhHant = (document.documentElement.lang || "").toLowerCase() === "zh-hant";
  var T = zhHant ? {
    title: "Amy 智能助手",
    hello: "您好，我係 Amy 嘅智能助手 🙏 有關多倫多福地、骨灰龕位、殯儀白事嘅問題都可以問我。您亦可以直接留低電話或微信，Amy 會盡快回覆您。",
    placeholder: "請輸入您嘅問題…",
    send: "發送",
    quick: ["買福地大約幾多錢？", "屋企人啱啱過身，點做？", "想預約參觀墓園"],
    error: "唔好意思，系統暫時繁忙。請直接致電或微信 Amy：647-649-9188。",
    disclaimer: "AI 回答僅供參考，具體以 Amy 講解為準",
    open: "在線諮詢"
  } : {
    title: "Amy 智能助手",
    hello: "您好，我是 Amy 的智能助手 🙏 关于多伦多墓地、骨灰位、殡仪服务的问题都可以问我。您也可以直接留下电话或微信，Amy 会尽快回复您。",
    placeholder: "请输入您的问题…",
    send: "发送",
    quick: ["买墓地大概多少钱？", "亲人刚去世，该怎么办？", "想预约参观墓园"],
    error: "抱歉，系统暂时繁忙。请直接致电或微信联系 Amy：647-649-9188。",
    disclaimer: "AI 回答仅供参考，具体以 Amy 讲解为准",
    open: "在线咨询"
  };

  var messages = [];       /* 发给后端的对话历史 {role, content} */
  var started = false;
  var busy = false;

  /* ---------- DOM ---------- */
  var bubble = document.createElement("button");
  bubble.className = "chat-bubble";
  bubble.type = "button";
  bubble.setAttribute("aria-label", T.open);
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>' +
    '<span>' + T.open + '</span>';

  var panel = document.createElement("div");
  panel.className = "chat-panel";
  panel.setAttribute("hidden", "");
  panel.innerHTML =
    '<div class="chat-head"><b>' + T.title + '</b>' +
      '<button class="chat-close" type="button" aria-label="close">×</button></div>' +
    '<div class="chat-msgs"></div>' +
    '<div class="chat-quick"></div>' +
    '<form class="chat-input">' +
      '<input type="text" placeholder="' + T.placeholder + '" autocomplete="off" maxlength="500">' +
      '<button type="submit">' + T.send + '</button></form>' +
    '<p class="chat-note">' + T.disclaimer + '</p>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var msgsEl = panel.querySelector(".chat-msgs");
  var quickEl = panel.querySelector(".chat-quick");
  var formEl = panel.querySelector(".chat-input");
  var inputEl = formEl.querySelector("input");

  function addMsg(role, text) {
    var div = document.createElement("div");
    div.className = "chat-m chat-" + role;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  }

  T.quick.forEach(function (q) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = q;
    b.addEventListener("click", function () { send(q); });
    quickEl.appendChild(b);
  });

  function openPanel() {
    panel.removeAttribute("hidden");
    bubble.setAttribute("hidden", "");
    if (!msgsEl.children.length) addMsg("bot", T.hello);
    inputEl.focus();
  }
  bubble.addEventListener("click", openPanel);
  /* 手机底栏的「AI 客服」按钮（由 lead.js 注入）也能打开面板 */
  document.addEventListener("click", function (e) {
    if (e.target.closest('[data-lead="ai"]')) openPanel();
  });
  panel.querySelector(".chat-close").addEventListener("click", function () {
    panel.setAttribute("hidden", "");
    bubble.removeAttribute("hidden");
  });

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = inputEl.value.trim();
    if (v) send(v);
  });

  /* ---------- 演示模式：本地模拟 AI 回复 ---------- */
  function demoReply(text) {
    var hasContact = /(\d[\d\-\s\.\)\(]{6,})|微信号?[:：]?\s*\S+|wechat/i.test(text);
    if (hasContact) {
      if (window.amyTrack) window.amyTrack("chat_lead", { page: location.pathname, demo: true });
      return zhHant
        ? "多謝您！已將您嘅聯絡方式同需求轉達俾 Amy，佢會喺 24 小時內親自回覆您。如屬緊急情況，請直接致電 24 小時熱線 647-649-9188。"
        : "谢谢您！已将您的联系方式和需求转达给 Amy，她会在 24 小时内亲自回复您。如属紧急情况，请直接拨打 24 小时热线 647-649-9188。";
    }
    if (/钱|價|价|費|费|幾多|多少/.test(text)) {
      return zhHant
        ? "福地價錢視乎墓園、穴位大細同坐向而定，風水位會有溢價，需要向 Amy 索取當期書面價目。殯儀服務費（稅前參考價）由直接火化 $3,225 到傳統舉殯 $6,635 不等。方便留低電話或微信嗎？Amy 會親自為您報價，諮詢免費。"
        : "墓地价格因墓园、地块大小和朝向差异很大（风水位有溢价），需要向 Amy 索取当期书面价目。殡仪服务费（税前参考价）从直接火化 $3,225 到传统举殡 $6,635 不等。方便留个电话或微信吗？Amy 会亲自为您报价，咨询免费。"; }
    if (/去世|過身|过世|走了|离世|離世/.test(text)) {
      return zhHant
        ? "請節哀。第一步係確認死亡並攞死亡醫學證明：喺醫院或老人院過身由院方開具；喺屋企過身先聯絡家庭醫生或打 911。之後請直接致電 24 小時熱線 647-649-9188，Amy 會安排接運遺體並逐步指引您。"
        : "请节哀。第一步是确认死亡并取得死亡医学证明：在医院或养老院去世由院方开具；在家中去世先联系家庭医生或拨打 911。随后请直接拨打 24 小时热线 647-649-9188，Amy 会安排接运遗体并一步步指引您。"; }
    if (/参观|參觀|睇位|看位/.test(text)) {
      return zhHant
        ? "冇問題。Amy 會全程陪同參觀高山（北約克）、好景（Gormley）、松柏（Ajax）同嘉麗（Oakville）四大墓園，逐園講解地形同風水坐向，參觀免費。方便留低電話或微信嗎？Amy 會同您約時間。"
        : "没问题。Amy 会全程陪同参观高山（北约克）、好景（Gormley）、松柏（Ajax）和嘉丽（Oakville）四大墓园，逐园讲解地形与风水朝向，参观免费。方便留个电话或微信吗？Amy 会和您约时间。"; }
    return zhHant
      ? "呢個問題 Amy 可以詳細解答您。方便留低電話或者微信嗎？佢會盡快親自回覆；亦可以直接致電 24 小時熱線 647-649-9188。"
      : "这个问题 Amy 可以为您详细解答。方便留个电话或微信吗？她会尽快亲自回复；也可以直接拨打 24 小时热线 647-649-9188。";
  }

  function send(text) {
    if (busy) return;
    busy = true;
    inputEl.value = "";
    quickEl.style.display = "none";
    addMsg("user", text);
    messages.push({ role: "user", content: text });
    if (!started) {
      started = true;
      if (window.amyTrack) window.amyTrack("chat_start", { page: location.pathname });
    }
    var typing = addMsg("bot", "…");

    if (DEMO) {
      setTimeout(function () {
        var r = demoReply(text);
        typing.textContent = r;
        messages.push({ role: "assistant", content: r });
        msgsEl.scrollTop = msgsEl.scrollHeight;
        busy = false;
      }, 900);
      return;
    }

    fetch(CFG.workerUrl.replace(/\/$/, "") + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.slice(-20),
        lang: zhHant ? "zh-Hant" : "zh-Hans",
        page: location.href
      })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (res) {
        typing.textContent = res.reply || T.error;
        messages.push({ role: "assistant", content: res.reply || "" });
        if (res.lead_captured && window.amyTrack) {
          window.amyTrack("chat_lead", { page: location.pathname });
        }
        msgsEl.scrollTop = msgsEl.scrollHeight;
      })
      .catch(function () { typing.textContent = T.error; })
      .finally(function () { busy = false; });
  }
})();
