"use strict";
var edaEsbuildExportName = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    about: () => about,
    activate: () => activate,
    openIframe: () => openIframe
  });

  // extension.json
  var displayName = "\u539F\u7406\u56FE-PCB \u5BF9\u6BD4";
  var description = "\u6BD4\u5BF9\u5DE5\u7A0B\u4E0B\u539F\u7406\u56FE\u4E0EPCB\u4E2D\u540C\u4F4D\u53F7\u5143\u4EF6\u662F\u5426\u5339\u914D\u6216\u7F3A\u5931";
  var version = "1.0.0";

  // src/index.ts
  function activate(status, arg) {
  }
  function about() {
    const title = "\u5173\u4E8E";
    const msg = `${displayName} ${version}
${description}`;
    eda.sys_MessageBox.showInformationMessage(msg, title);
  }
  function openIframe() {
    const width = 1e3;
    const height = 400;
    eda.sys_IFrame.openIFrame("/iframe/index.html", width, height);
  }
  return __toCommonJS(src_exports);
})();
