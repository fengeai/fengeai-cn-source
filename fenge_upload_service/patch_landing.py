import os

file_path = '/root/banana-slides/frontend/src/pages/Landing.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
inserted = False
already_patched = False

for line in lines:
    if 'Injected Bootcamp Card' in line:
        already_patched = True
        break

if already_patched:
    print('Already patched')
    exit(0)

for line in lines:
    new_lines.append(line)
    if 'const data = await getTools();' in line and not inserted:
        new_lines.append('      // Injected Bootcamp Card\n')
        new_lines.append('      const bootcampTool: Tool = {\n')
        new_lines.append('        id: 9999,\n')
        new_lines.append('        name: "枫哥 AI 编程特战营",\n')
        new_lines.append('        description: "春节 10 天，从 0 到 1，亲手上线你的第一个 AI 产品。Docker 容器化部署，国内秒开。",\n')
        new_lines.append('        icon: "Rocket",\n')
        new_lines.append('        route: "http://47.121.114.176:3000/upload",\n')
        new_lines.append('        status: "active",\n')
        new_lines.append('        category: "bootcamp",\n')
        new_lines.append('        usage_count: 88,\n')
        new_lines.append('        sort_order: 0,\n')
        new_lines.append('        is_external: true,\n')
        new_lines.append('        created_at: new Date().toISOString(),\n')
        new_lines.append('        updated_at: new Date().toISOString()\n')
        new_lines.append('      };\n')
        new_lines.append('      if (!data.tools) data.tools = [];\n')
        new_lines.append('      data.tools.unshift(bootcampTool);\n')
        inserted = True

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Patched Landing.tsx successfully')
