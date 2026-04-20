import urllib.request

# 获取预览页面
r = urllib.request.urlopen('http://localhost:8000/api/sdk/1d6c534bb8140af0a758ef300d6037f1/preview')
content = r.read()

# 保存到文件
with open('f:\\sdkprojects\\preview_output.html', 'wb') as f:
    f.write(content)

print('预览页面已保存到 preview_output.html')
print('Content length:', len(content))
