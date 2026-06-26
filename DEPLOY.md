# 腾讯云 CloudBase 部署指南

本指南把 `brain-games` 的前后端一起部署到腾讯云 CloudBase。

## 部署架构

| 组件 | CloudBase 产品 | 用途 |
|------|---------------|------|
| 前端 | 静态网站托管 | 部署 HTML/CSS/JS |
| 后端 | 云函数 | 部署 Node.js API |
| 数据库 | 云数据库 (MongoDB) | 存储用户、训练记录、试次明细 |

---

## 前置准备

1. 注册腾讯云账号：https://cloud.tencent.com/
2. 实名认证
3. 安装 CloudBase CLI：
   ```bash
   npm install -g @cloudbase/cli
   ```
4. 登录 CloudBase CLI：
   ```bash
   tcb login
   ```

---

## 第一步：创建 CloudBase 环境

1. 打开 https://console.cloud.tencent.com/tcb
2. 点击「新建环境」
3. 选择「按量计费」（新用户有免费额度）
4. 记录环境 ID，例如：`brain-games-xxx`

---

## 第二步：开通云数据库

1. 进入刚创建的环境
2. 左侧菜单选择「数据库」→「云数据库」
3. 点击「开通」
4. 创建以下集合（点击「添加集合」）：
   - `users`
   - `sessions`
   - `trials`

---

## 第三步：部署后端云函数

### 3.1 修改配置文件

编辑项目根目录的 `cloudbaserc.json`，把 `envId` 改成你的环境 ID：

```json
{
  "envId": "brain-games-xxx",
  ...
}
```

### 3.2 安装依赖

```bash
cd backend
npm install
```

### 3.3 部署云函数

在项目根目录执行：

```bash
tcb fn deploy brain-games-api
```

或者使用：

```bash
tcb framework deploy
```

### 3.4 开启 HTTP 访问

1. 进入 CloudBase 控制台 → 云函数
2. 找到 `brain-games-api`
3. 点击「触发管理」→「创建触发器」
4. 选择「HTTP 触发」
5. 勾选 GET、POST、DELETE、OPTIONS
6. 记录访问路径，例如：
   ```
   https://brain-games-xxx-xxx.service.tcloudbase.com/brain-games-api
   ```

---

## 第四步：修改前端 API 地址

编辑 `js/core/config.js`：

```javascript
window.__BRAIN_CONFIG__ = {
  API_BASE: 'https://brain-games-xxx-xxx.service.tcloudbase.com/brain-games-api'
};
```

把地址改成你刚记录的 HTTP 触发地址。

---

## 第五步：部署前端到静态托管

### 5.1 开通静态托管

1. 进入 CloudBase 控制台 → 静态网站托管
2. 点击「开通」

### 5.2 上传前端文件

在项目根目录执行：

```bash
tcb hosting deploy . -e brain-games-xxx
```

或者分步上传：

```bash
tcb hosting deploy ./index.html -e brain-games-xxx
tcb hosting deploy ./category.html -e brain-games-xxx
tcb hosting deploy ./game.html -e brain-games-xxx
tcb hosting deploy ./results.html -e brain-games-xxx
tcb hosting deploy ./dashboard.html -e brain-games-xxx
tcb hosting deploy ./admin.html -e brain-games-xxx
tcb hosting deploy ./css -e brain-games-xxx
tcb hosting deploy ./js -e brain-games-xxx
```

### 5.3 访问网站

静态托管会给你一个默认域名，例如：

```
https://brain-games-xxx.tcloudbaseapp.com
```

在浏览器中打开即可。

---

## 第六步：配置 CORS（如需要）

如果前端域名和后端域名不同，云函数已经默认返回 `Access-Control-Allow-Origin: *`，一般无需额外配置。

---

## 第七步：测试

1. 打开静态托管地址
2. 输入姓名和 4 位 PIN 登录
3. 玩一个游戏
4. 访问 `https://你的域名/admin.html?admin=1`
5. 查看记录并导出 Excel

---

## 费用说明

- CloudBase 新用户有免费额度
- 小规模使用（几十个用户）通常长期免费或每月几元钱
- 具体费用以腾讯云账单为准

---

## 常见问题

**Q: 云函数返回 504 或超时？**
A: 在 `cloudbaserc.json` 中把 `timeout` 调大，或者检查云数据库是否已开通。

**Q: 数据没有保存？**
A: 打开浏览器 F12 → Network，看 `saveSession` 请求是否成功，以及 `config.js` 中的 `API_BASE` 是否配置正确。

**Q: 如何更新代码？**
A: 修改代码后重新执行 `tcb fn deploy brain-games-api` 和 `tcb hosting deploy . -e brain-games-xxx`。

---

## 本地开发

本地开发仍然使用 JSON 文件存储，不需要 CloudBase：

```bash
# 终端 1：后端
cd backend
npm install
node server.js

# 终端 2：前端
cd ..
node server.js
```

浏览器打开 http://127.0.0.1:3000
