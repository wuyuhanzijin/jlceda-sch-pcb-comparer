import * as extensionConfig from '../extension.json';

export function activate(status?: 'onStartupFinished', arg?: string): void {}

export function about(): void {
  const title = '关于';
  const msg = `${extensionConfig.displayName} ${extensionConfig.version}\n${extensionConfig.description}`;
  eda.sys_MessageBox.showInformationMessage(msg, title);
}

export function openIframe(): void {
  const width = 1000;
  const height = 400;
  eda.sys_IFrame.openIFrame('/iframe/index.html', width, height);
}
