#! /usr/bin/env sh
git pull
git status
git add .
git commit . -m "update"
git push -u origin main
npm install
npm run build

set -e
cd dist
echo "已成功进入目录打包...正在进行打包"
7z a ../zip/dist.zip ./
echo "已经成功打包"

echo "***** 上传中 *****"
scp -v -r ../zip/dist.zip root@154.37.212.50:/www/wwwroot/flow.foxora.cn/
echo "***** 成功上传 *****"
# del /q /f ../zip/dist.zip
echo "***** 进入服务器，触发远端程序 *****"
ssh root@154.37.212.50 "sh /www/wwwroot/bash/autodeploy.sh"
echo "***** 传输完毕*****"
