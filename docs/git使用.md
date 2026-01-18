# GitHub 代码提交手册

## 目录
1. [初始化与克隆](#初始化与克隆)
2. [拉取与同步](#拉取与同步)
3. [提交代码](#提交代码)
4. [分支管理](#分支管理)
5. [合并与冲突解决](#合并与冲突解决)
6. [常用命令速查](#常用命令速查)

---

## 初始化与克隆

### 克隆远程仓库
```bash
git clone https://github.com/PeileLi/FYP.git
cd FYP
```

### 首次配置本地Git
```bash
# 配置用户名
git config user.name "Peile Li"

# 配置邮箱
git config user.email "2871253570@qq.com"

# 全局配置（对所有项目有效）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 查看配置
git config --list
```

---

## 拉取与同步

### 查看远程仓库信息
```bash
# 查看远程仓库列表
git remote -v

# 查看特定远程仓库详细信息
git remote show origin
```

### 拉取最新代码

#### 1. 使用 `git pull`（推荐用于日常更新）
```bash
# 从默认远程分支拉取并自动合并
git pull

# 从特定远程分支拉取
git pull origin main

# 拉取特定分支
git pull origin <branch-name>
```

#### 2. 使用 `git fetch` + `git merge`（更安全，可检查变更）
```bash
# 只拉取不合并（先查看变更）
git fetch origin

# 查看拉取的内容
git diff origin/main

# 手动合并
git merge origin/main
```

### 同步步骤（标准工作流）
```bash
# 1. 保存本地未提交的工作
git stash

# 2. 拉取最新代码
git pull origin main

# 3. 恢复之前的工作
git stash pop

# 如果有冲突，解决后继续
git add .
git commit -m "Resolve conflicts"
```

---

## 提交代码

### 第一步：检查状态
```bash
# 查看工作区的修改状态
git status

# 查看具体文件修改内容
git diff
```

### 第二步：添加文件到暂存区
```bash
# 添加特定文件
git add <filename>

# 添加所有修改
git add .

# 添加指定类型的文件
git add *.java    # 添加所有Java文件
git add src/      # 添加整个目录

# 查看暂存区内容
git diff --staged
```

### 第三步：提交到本地仓库
```bash
# 基本提交
git commit -m "提交信息"

# 提交信息规范建议
git commit -m "type: 简要描述

详细描述（可选）
- 修改了什么
- 为什么修改
- 可能的影响"

# 示例
git commit -m "feat: 添加用户登录功能

- 实现JWT身份验证
- 添加登录接口
- 集成密码加密"
```

### 第四步：推送到远程仓库
```bash
# 推送到默认远程分支
git push

# 推送到特定远程分支
git push origin main

# 推送指定本地分支到远程
git push origin <local-branch>:<remote-branch>

# 首次推送新分支时
git push -u origin <branch-name>

# 强制推送（谨慎使用！）
git push -f origin <branch-name>
```

### 完整提交流程
```bash
# 1. 检查状态
git status

# 2. 添加文件
git add .

# 3. 查看暂存内容
git status

# 4. 提交
git commit -m "feat: 完成功能描述"

# 5. 推送到远程
git push origin main
```

---

## 分支管理

### 创建和切换分支
```bash
# 创建本地分支
git branch <branch-name>

# 创建并切换到新分支
git checkout -b <branch-name>
# 或（Git 2.23+）
git switch -c <branch-name>

# 查看所有分支
git branch -a

# 切换分支
git checkout <branch-name>
# 或
git switch <branch-name>

# 删除本地分支
git branch -d <branch-name>

# 强制删除分支
git branch -D <branch-name>
```

### 分支推送到远程
```bash
# 推送新分支到远程
git push -u origin <branch-name>

# 删除远程分支
git push origin --delete <branch-name>
```

### 建议的分支命名
```
main              # 主分支，生产环境
develop           # 开发分支
feature/xxx       # 功能分支
bugfix/xxx        # 修复分支
release/xxx       # 发布分支
hotfix/xxx        # 紧急修复分支
```

---

## 合并与冲突解决

### 合并分支
```bash
# 切换到目标分支（通常是main）
git checkout main

# 从main拉取最新代码
git pull origin main

# 合并特定分支
git merge <branch-name>

# 取消合并
git merge --abort
```

### 处理合并冲突
```bash
# 1. 查看冲突文件
git status

# 2. 查看冲突内容
git diff

# 3. 手动编辑冲突文件（编辑器中修改）
#    冲突标记：
#    <<<<<<< HEAD
#    当前分支内容
#    =======
#    合并分支内容
#    >>>>>>> branch-name

# 4. 解决后添加文件
git add <resolved-file>

# 5. 完成合并
git commit -m "Merge: 解决合并冲突"
```

---

## 常用命令速查

### 查看提交历史
```bash
# 查看提交日志
git log

# 单行显示
git log --oneline

# 显示最近N条
git log -n 5

# 查看特定文件的提交历史
git log <filename>

# 查看某人的提交
git log --author="name"

# 按日期筛选
git log --since="2024-01-01" --until="2024-12-31"
```

### 撤销操作
```bash
# 撤销工作区修改（未添加到暂存区）
git restore <filename>
# 或
git checkout -- <filename>

# 撤销暂存区修改（从暂存区移除但保留文件内容）
git restore --staged <filename>
# 或
git reset HEAD <filename>

# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 撤销最后一次提交（丢弃修改）
git reset --hard HEAD~1

# 查看丢弃的提交
git reflog

# 恢复丢弃的提交
git reset --hard <commit-hash>
```

### 标签操作
```bash
# 创建标签
git tag v1.0.0

# 创建带注释的标签
git tag -a v1.0.0 -m "版本1.0.0"

# 推送标签到远程
git push origin v1.0.0

# 推送所有标签
git push origin --tags

# 查看所有标签
git tag -l

# 删除本地标签
git tag -d v1.0.0

# 删除远程标签
git push origin --delete v1.0.0
```

### 代码审查和查看
```bash
# 查看两个分支的差异
git diff main develop

# 查看某个提交的修改内容
git show <commit-hash>

# 查看特定文件在某个版本的内容
git show <commit-hash>:<filename>

# 逐行查看文件修改者
git blame <filename>
```

---

## 工作流最佳实践

### 日常开发流程
```bash
# 1. 开始工作前，更新本地分支
git pull origin develop

# 2. 创建功能分支
git checkout -b feature/my-feature

# 3. 在功能分支上开发和提交
git add .
git commit -m "feat: 描述"
git push origin feature/my-feature

# 4. 在GitHub上提交Pull Request

# 5. 代码审查通过后，在GitHub上合并
# 或使用命令合并
git checkout main
git pull origin main
git merge feature/my-feature
git push origin main

# 6. 删除功能分支
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### 提交信息规范
```
类型说明:
- feat:     新功能
- fix:      修复bug
- docs:     文档修改
- style:    代码格式调整（不改变逻辑）
- refactor: 代码重构
- perf:     性能优化
- test:     测试相关
- chore:    构建流程或依赖变更

示例:
git commit -m "feat: 添加用户认证模块"
git commit -m "fix: 修复登录页面样式bug"
git commit -m "docs: 更新API文档"
git commit -m "refactor: 优化数据库查询逻辑"
```

---

## 常见问题

### Q: 如何关联本地仓库与远程仓库？
```bash
git remote add origin https://github.com/username/repository.git
git branch -M main
git push -u origin main
```

### Q: 如何撤销已推送的提交？
```bash
# 软撤销（保留修改）
git revert <commit-hash>
git push origin main

# 如果还未被他人拉取，可以强制覆盖
git reset --hard HEAD~1
git push -f origin main
```

### Q: 如何查看我的贡献？
```bash
git log --author="Your Name" --oneline
git shortlog -sn
```

### Q: 如何处理大文件？
```bash
# 查看最大的文件
git rev-list --all --objects | sort -k2 | tail -10 | cut -f2- | xargs ls -lh

# 从历史中删除大文件
git filter-branch --tree-filter 'rm -f <file>' HEAD
```

---

## 快速参考卡

| 操作 | 命令 |
|------|------|
| 拉取最新代码 | `git pull origin main` |
| 添加所有文件 | `git add .` |
| 提交 | `git commit -m "message"` |
| 推送 | `git push origin main` |
| 创建分支 | `git checkout -b branch-name` |
| 查看日志 | `git log --oneline` |
| 查看状态 | `git status` |
| 查看差异 | `git diff` |

---
