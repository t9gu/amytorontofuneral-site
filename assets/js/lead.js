/* ============================================================
   amytorontofuneral.ca — Lead 追踪与转化组件
   功能：GA4 事件统计 · 电话号码动态替换(DNI) · 浮动联系栏 ·
        微信二维码弹窗 · 预约表单来源标记 · UTM 捕获
   ------------------------------------------------------------
   ▼▼ 上线前只需填写下面这个配置块（详见 docs/lead-tracking-setup.md）▼▼
   ============================================================ */
window.AMY_CONFIG = {
  /* GA4 衡量 ID，例如 "G-XXXXXXXXXX"。留空 = 不加载统计 */
  ga4Id: "G-R2MH9GY3KY",
  /* Twilio 专属转接号（纯数字，例如 "6475551234"）。
     留空 = 页面继续显示真实号 647-649-9188，不做替换 */
  trackingNumber: "",
  /* 转接号的显示格式，例如 "647-555-1234" */
  trackingNumberDisplay: "",
  /* WhatsApp 号码（国际格式、不带 +，与 Amy 手机同号则保持默认） */
  whatsappNumber: "16476499188",
  /* 微信号（用于「复制微信号」按钮） */
  wechatId: "AmyHuangToronto",
  /* Cloudflare Worker 地址（AI 客服后端），例如
     "https://amy-leads.xxxx.workers.dev"。留空 = 不显示 AI 客服。
     "demo" = 演示模式（本地模拟回复，仅限给客户演示时用，切勿在线上开启）。
     部署 Worker 后（见 docs/lead-tracking-setup.md 第 5 节）把真实地址填到这里。 */
  workerUrl: "",
  /* Web3Forms Access Key（预约表单邮件投递）。留空 = 表单降级为 mailto */
  web3formsKey: "62eaa61a-13e7-426a-9575-c356fbaf9f6b"
};

(function () {
  "use strict";
  var CFG = window.AMY_CONFIG;
  var zhHant = (document.documentElement.lang || "").toLowerCase() === "zh-hant";
  var base = location.pathname.indexOf("/zh-hant/") !== -1 ? "../" : "";
  var REAL_NUMBER = "6476499188";

  /* ---------- 文案（简/繁自动切换） ---------- */
  var T = zhHant ? {
    call: "致電", wechat: "微信", whatsapp: "WhatsApp", form: "留言預約", ai: "AI 客服",
    wechatTitle: "加 Amy 微信",
    wechatNote: "掃碼或搜索微信號添加，添加時請備註：<b>官網</b>",
    copy: "複製微信號", copied: "已複製 ✓",
    waText: "您好Amy，我喺官網 amytorontofuneral.ca 見到您嘅服務，想諮詢一下。",
    mailSubject: "【官網諮詢】", close: "關閉"
  } : {
    call: "致电", wechat: "微信", whatsapp: "WhatsApp", form: "留言预约", ai: "AI 客服",
    wechatTitle: "加 Amy 微信",
    wechatNote: "扫码或搜索微信号添加，添加时请备注：<b>官网</b>",
    copy: "复制微信号", copied: "已复制 ✓",
    waText: "您好Amy，我在官网 amytorontofuneral.ca 看到您的服务，想咨询一下。",
    mailSubject: "【官网咨询】", close: "关闭"
  };

  /* ---------- GA4 ---------- */
  if (CFG.ga4Id) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + CFG.ga4Id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CFG.ga4Id);
  }
  function track(name, params) {
    if (window.gtag) window.gtag("event", name, params || {});
  }
  window.amyTrack = track;

  /* ---------- UTM / 来源捕获（首次进站记录，会话内保留） ---------- */
  function captureSource() {
    var KEY = "amy_src";
    try {
      if (sessionStorage.getItem(KEY)) return JSON.parse(sessionStorage.getItem(KEY));
      var q = new URLSearchParams(location.search);
      var src = {
        landing: location.href.split("#")[0],
        referrer: document.referrer || "(direct)",
        utm_source: q.get("utm_source") || "",
        utm_medium: q.get("utm_medium") || "",
        utm_campaign: q.get("utm_campaign") || "",
        gclid: q.get("gclid") || "",
        fbclid: q.get("fbclid") || "",
        first_seen: new Date().toISOString()
      };
      sessionStorage.setItem(KEY, JSON.stringify(src));
      return src;
    } catch (e) { return {}; }
  }
  var SRC = captureSource();

  /* ---------- 电话号码动态替换（DNI）----------
     只替换 tel: 链接（href 与可见文字），微信号中的号码不受影响 */
  function applyDNI() {
    if (!CFG.trackingNumber) return;
    var display = CFG.trackingNumberDisplay || CFG.trackingNumber;
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.href = "tel:" + CFG.trackingNumber;
      a.textContent = a.textContent.replace(/647[-.\s]?649[-.\s]?9188/g, display);
    });
  }

  /* ---------- 浮动联系栏 ---------- */
  function waLink() {
    return "https://wa.me/" + CFG.whatsappNumber + "?text=" + encodeURIComponent(T.waText);
  }
  function telHref() {
    return "tel:" + (CFG.trackingNumber || REAL_NUMBER);
  }
  function injectContactBar() {
    var bar = document.createElement("div");
    bar.className = "lead-bar";
    bar.innerHTML =
      '<a class="lead-btn lead-call" href="' + telHref() + '" data-lead="call">' +
        '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>' +
        '<span>' + T.call + '</span></a>' +
      '<button class="lead-btn lead-wechat" type="button" data-lead="wechat">' +
        '<svg viewBox="0 0 24 24"><path d="M9.5 4C5.4 4 2 6.8 2 10.2c0 1.9 1 3.6 2.7 4.7l-.7 2.3 2.6-1.4c.6.2 1.3.3 2 .4-.1-.4-.1-.8-.1-1.2 0-3.3 3.2-6 7-6h.4C15.3 6.2 12.7 4 9.5 4zM7 8.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm5 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM15.5 10c-3.6 0-6.5 2.4-6.5 5.3s2.9 5.2 6.5 5.2c.7 0 1.4-.1 2-.3L20 21.4l-.6-2c1.6-1 2.6-2.5 2.6-4.1 0-2.9-2.9-5.3-6.5-5.3zm-2.2 2.6a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm4.4 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z"/></svg>' +
        '<span>' + T.wechat + '</span></button>' +
      '<a class="lead-btn lead-wa" href="' + waLink() + '" target="_blank" rel="noopener" data-lead="whatsapp">' +
        '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.1-4.7-4-4.9-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2.1 1c.3.2.5.3.6.4 0 .1 0 .7-.2 1.3z"/></svg>' +
        '<span>' + T.whatsapp + '</span></a>' +
      '<a class="lead-btn lead-form" href="index.html#lead-form" data-lead="form">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>' +
        '<span>' + T.form + '</span></a>' +
      /* AI 客服按钮：仅手机端显示（CSS 控制），点击由 chat.js 接管打开聊天面板 */
      (CFG.workerUrl ?
      '<button class="lead-btn lead-ai" type="button" data-lead="ai">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/></svg>' +
        '<span>' + T.ai + '</span></button>' : '');
    document.body.appendChild(bar);
    document.body.classList.add("has-lead-bar");
  }

  /* ---------- 微信弹窗 ---------- */
  function injectWechatModal() {
    var m = document.createElement("div");
    m.className = "wx-modal";
    m.setAttribute("hidden", "");
    m.innerHTML =
      '<div class="wx-backdrop" data-wx-close></div>' +
      '<div class="wx-card" role="dialog" aria-modal="true" aria-label="' + T.wechatTitle + '">' +
        '<button class="wx-close" type="button" data-wx-close aria-label="' + T.close + '">×</button>' +
        '<h3>' + T.wechatTitle + '</h3>' +
        '<img src="' + base + 'images/wechat-qr.jpg" alt="Amy 微信二维码 WeChat QR" width="220" height="220" loading="lazy">' +
        '<p class="wx-id">1.647.649.9188 ／ ' + CFG.wechatId + '</p>' +
        '<p class="wx-note">' + T.wechatNote + '</p>' +
        '<button class="btn btn-gold wx-copy" type="button">' + T.copy + '</button>' +
      '</div>';
    document.body.appendChild(m);

    function open() {
      m.removeAttribute("hidden");
      track("wechat_qr_view", { page: location.pathname });
    }
    function close() { m.setAttribute("hidden", ""); }

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-lead='wechat'], [data-wx-open]");
      if (t) { e.preventDefault(); open(); }
      if (e.target.closest("[data-wx-close]")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    m.querySelector(".wx-copy").addEventListener("click", function () {
      var btn = this;
      var done = function () {
        btn.textContent = T.copied;
        track("wechat_copy", { page: location.pathname });
        setTimeout(function () { btn.textContent = T.copy; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(CFG.wechatId).then(done, done);
      } else { done(); }
    });
  }

  /* ---------- 预约表单：隐藏来源字段 + Web3Forms 提交 ---------- */
  function bindLeadForms() {
    document.querySelectorAll("form[data-lead-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        /* honeypot：机器人勾了这个隐藏字段就静默丢弃 */
        var hp = form.querySelector('[name="botcheck"]');
        if (hp && (hp.type === "checkbox" ? hp.checked : hp.value)) return;

        var fd = new FormData(form);
        fd.set("access_key", CFG.web3formsKey);
        fd.set("subject", T.mailSubject + " 官网预约表单 - " + (fd.get("称呼") || ""));
        fd.set("from_name", "amytorontofuneral.ca 官网表单");
        /* 隐藏来源标记 */
        fd.set("来源_source", "amytorontofuneral.ca 官网");
        fd.set("来源_着陆页", SRC.landing || "");
        fd.set("来源_当前页", location.href);
        fd.set("来源_referrer", SRC.referrer || "");
        if (SRC.utm_source) fd.set("来源_utm", SRC.utm_source + " / " + SRC.utm_medium + " / " + SRC.utm_campaign);
        if (SRC.gclid) fd.set("来源_gclid", SRC.gclid);
        fd.set("提交时间", new Date().toLocaleString("zh-CN", { timeZone: "America/Toronto" }) + " (多伦多时间)");

        if (!CFG.web3formsKey) {
          /* 未配置 Web3Forms 时降级为邮件客户端 */
          location.href = "mailto:ahuang@arbormemorial.com?subject=" +
            encodeURIComponent(T.mailSubject + (fd.get("称呼") || "")) +
            "&body=" + encodeURIComponent(
              "电话: " + (fd.get("电话") || "") + "\n微信: " + (fd.get("微信号") || "") +
              "\n咨询: " + (fd.get("咨询类型") || "") + "\n留言: " + (fd.get("留言") || ""));
          return;
        }
        var btn = form.querySelector('button[type="submit"]');
        var old = btn.textContent;
        btn.disabled = true; btn.textContent = zhHant ? "提交中…" : "提交中…";
        fetch("https://api.web3forms.com/submit", { method: "POST", body: fd })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.success) {
              track("form_submit", { topic: fd.get("咨询类型") || "" });
              location.href = base + "thanks.html";
            } else { throw new Error(res.message); }
          })
          .catch(function () {
            btn.disabled = false; btn.textContent = old;
            alert(zhHant ? "提交失敗，請直接致電或微信聯絡 Amy。" : "提交失败，请直接致电或微信联系 Amy。");
          });
      });
    });
  }

  /* ---------- 点击事件统计（电话 / 邮件 / WhatsApp） ---------- */
  function bindClickTracking() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (href.indexOf("tel:") === 0) {
        track("call_click", { page: location.pathname, number: href.slice(4) });
      } else if (href.indexOf("mailto:") === 0) {
        track("email_click", { page: location.pathname });
      } else if (href.indexOf("wa.me") !== -1) {
        track("whatsapp_click", { page: location.pathname });
      }
    });
  }

  /* ---------- mailto 链接加来源主题 ---------- */
  function tagMailto() {
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      if (a.href.indexOf("subject=") !== -1) return;
      a.href += (a.href.indexOf("?") === -1 ? "?" : "&") +
        "subject=" + encodeURIComponent(T.mailSubject) +
        "&body=" + encodeURIComponent(T.waText);
    });
  }

  /* ---------- init ---------- */
  function init() {
    applyDNI();
    tagMailto();
    injectContactBar();
    injectWechatModal();
    bindLeadForms();
    bindClickTracking();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
