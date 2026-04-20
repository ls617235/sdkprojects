import asyncpg
import asyncio
import base64

async def check_sdk():
    try:
        conn = await asyncpg.connect('postgres://postgres:123456@127.0.0.1:5432/postgres')
        
        # 获取最新的 SDK
        sdk = await conn.fetchrow(
            "SELECT * FROM sdk_shares WHERE name = $1 ORDER BY created_at DESC LIMIT 1",
            'lingtong-assistant'
        )
        
        if not sdk:
            print('SDK not found')
            return
        
        print(f'SDK: {sdk["name"]}')
        print(f'Token: {sdk["share_token"]}')
        print()
        
        # 获取页面代码
        pages = await conn.fetch(
            "SELECT * FROM sdk_pages WHERE sdk_id = $1 ORDER BY page_order",
            sdk['id']
        )
        
        for page in pages:
            print(f'--- Page: {page["name"]} ---')
            code = page['code']
            
            # 查找 Base64 编码的 HTML
            import re
            b64_match = re.search(r'var SDK_HTML = decodeB64\("([^"]+)"\)', code)
            if b64_match:
                b64_html = b64_match.group(1)
                html = base64.b64decode(b64_html).decode('utf-8')
                print('Decoded HTML (first 3000 chars):')
                print(html[:3000])
            else:
                print('No Base64 HTML found in code')
                print('Code preview (first 2000 chars):')
                print(code[:2000])
            
        await conn.close()
    except Exception as e:
        print('Error:', e)

asyncio.run(check_sdk())
