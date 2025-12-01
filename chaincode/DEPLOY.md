# 链码部署脚本使用说明

`deploy.sh` 是一个自动化脚本，用于将链码部署到 Fabric 测试网络。

## 基本用法

### 方法 1：使用默认参数（最简单）

从项目根目录运行：

```bash
./chaincode/deploy.sh
```

这将使用以下默认值：
- 链码名称：`basic`
- 链码路径：`../../../chaincode`（相对于 test-network 目录）
- 语言：`go`
- 版本：`1.0`
- 序列号：`1`
- 通道名称：`mychannel`

### 方法 2：自定义参数

```bash
./chaincode/deploy.sh [链码名称] [链码路径] [语言] [版本] [序列号] [通道名称]
```

**参数说明：**
1. **链码名称**（可选，默认：`basic`）
   - 您想要给链码起的名称
   - 示例：`mychaincode`、`donation-project`

2. **链码路径**（可选，默认：`../../../chaincode`）
   - 链码源代码的路径（相对于 test-network 目录）
   - 或使用绝对路径
   - 示例：`../../../chaincode`、`/home/user/project/FYP/chaincode`

3. **语言**（可选，默认：`go`）
   - 链码编程语言
   - 支持：`go`、`java`、`javascript`、`typescript`

4. **版本**（可选，默认：`1.0`）
   - 链码版本号
   - 示例：`1.0`、`1.1`、`2.0`

5. **序列号**（可选，默认：`1`）
   - 链码定义的序列号
   - 更新链码时需要递增
   - 示例：`1`、`2`、`3`

6. **通道名称**（可选，默认：`mychannel`）
   - 要部署到的通道名称
   - 示例：`mychannel`、`channel1`

## 使用示例

### 示例 1：使用默认值部署

```bash
cd ~/project/FYP
./chaincode/deploy.sh
```

### 示例 2：自定义链码名称

```bash
./chaincode/deploy.sh donation-project
```

### 示例 3：指定所有参数

```bash
./chaincode/deploy.sh donation-project ../../../chaincode go 1.0 1 mychannel
```

### 示例 4：更新链码（使用新版本和序列号）

```bash
# 第一次部署
./chaincode/deploy.sh basic ../../../chaincode go 1.0 1 mychannel

# 更新链码（修改代码后）
./chaincode/deploy.sh basic ../../../chaincode go 1.1 2 mychannel
```

## 脚本功能

脚本会自动执行以下操作：

1. **检查环境**
   - 验证 test-network 目录是否存在
   - 验证 chaincode 目录是否存在

2. **启动网络**（如需要）
   - 如果 Fabric 网络未运行，会自动启动网络并创建通道

3. **部署链码**
   - 打包链码
   - 在所有 peer 节点上安装
   - 批准链码定义
   - 提交链码定义

4. **显示测试命令**
   - 部署成功后，会显示如何测试链码的示例命令

## 部署后的测试

部署成功后，您可以使用以下命令测试链码：

### 查询项目

```bash
cd fabric/fabric-samples/test-network

# 查询 ID 为 1 的项目（使用单引号，ID 为字符串）
./network.sh cc query -c mychannel -ccn basic -ccqc '{"function":"ReadProject","Args":["1"]}'
```

### 创建项目

```bash
# 创建新项目（ID: 3，注意：避免在参数中使用空格）
./network.sh cc invoke -c mychannel -ccn basic -ccic '{"function":"CreateProject","Args":["3","TestProject","Description","owner"]}'

# 如果必须在标题中使用空格，使用环境变量：
# export CC_INVOKE='{"function":"CreateProject","Args":["3","Test Project","Description","owner"]}'
# ./network.sh cc invoke -c mychannel -ccn basic -ccic "$CC_INVOKE"
```

### 更新项目

```bash
# 更新项目（ID: 1，避免在参数中使用空格）
./network.sh cc invoke -c mychannel -ccn basic -ccic '{"function":"UpdateProject","Args":["1","UpdatedTitle","UpdatedDescription","newowner"]}'
```

### 删除项目

```bash
# 删除项目（ID: 1，ID 为字符串）
./network.sh cc invoke -c mychannel -ccn basic -ccic '{"function":"DeleteProject","Args":["1"]}'
```

### 初始化账本

```bash
# 初始化测试数据
./network.sh cc invoke -c mychannel -ccn basic -ccic '{"function":"InitLedger","Args":[]}'
```

## 注意事项

1. **JSON 参数中的空格问题**
   - `network.sh` 在处理 `-ccic` 和 `-ccqc` 参数时，如果 JSON 中包含空格，可能会被 shell 分割
   - **解决方案**：
     - 使用单引号包裹整个 JSON：`'{"function":"...","Args":[...]}'`
     - 避免在参数值中使用空格（使用下划线或连字符代替）
     - 如果必须使用空格，使用环境变量：
       ```bash
       export CC_INVOKE='{"function":"CreateProject","Args":["3","Test Project","Description","owner"]}'
       ./network.sh cc invoke -c mychannel -ccn basic -ccic "$CC_INVOKE"
       ```

2. **路径问题**
   - 脚本会自动计算正确的路径
   - 如果使用相对路径，确保相对于 test-network 目录

3. **网络状态**
   - 如果网络未运行，脚本会自动启动
   - 如果网络已运行，脚本会直接部署

4. **权限问题**
   - 确保脚本有执行权限：`chmod +x chaincode/deploy.sh`
   - 确保 Docker 正在运行

5. **更新链码**
   - 更新链码时，必须递增版本号和序列号
   - 例如：从 `1.0/1` 更新到 `1.1/2`

6. **ID 参数格式**
   - 所有 ID 参数必须是字符串格式：`"1"` 而不是 `1`
   - 使用单引号包裹 JSON 以避免转义问题

## 故障排除

### 错误：test-network 目录未找到

```bash
# 确保 fabric-samples 已正确安装
ls fabric/fabric-samples/test-network
```

### 错误：链码目录未找到

```bash
# 检查链码目录是否存在
ls chaincode/chaincode.go
```

### 错误：Docker 未运行

```bash
# 启动 Docker
sudo systemctl start docker
# 或
docker ps
```

### 错误：部署失败

```bash
# 检查网络是否正常运行
cd fabric/fabric-samples/test-network
docker ps

# 查看详细日志
./network.sh deployCC -ccn basic -ccp ../../../chaincode -ccl go -ccv 1.0 -ccs 1
```

## 完整工作流程示例

```bash
# 1. 进入项目根目录
cd ~/project/FYP

# 2. 部署链码（使用默认值）
./chaincode/deploy.sh

# 3. 进入 test-network 目录
cd fabric/fabric-samples/test-network

# 4. 初始化账本
./network.sh cc invoke -c mychannel -ccn basic -ccic '{"function":"InitLedger","Args":[]}'

# 5. 查询项目
./network.sh cc query -c mychannel -ccn basic -ccqc '{"function":"ReadProject","Args":["1"]}'

# 6. 创建新项目（避免在参数中使用空格）
./network.sh cc invoke -c mychannel -ccn basic -ccic '{"function":"CreateProject","Args":["3","NewProject","Description","owner"]}'
```

