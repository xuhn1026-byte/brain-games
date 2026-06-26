/**
 * Brain Games 全局配置
 * 部署到腾讯云 CloudBase 时，把 API_BASE 改成你的云函数 HTTP 访问地址
 */
window.__BRAIN_CONFIG__ = {
  // 本地开发默认地址
  API_BASE: 'http://127.0.0.1:3001'

  // 部署到 CloudBase 后改成类似：
  // API_BASE: 'https://你的环境ID-服务名.service.tcloudbase.com'
};
