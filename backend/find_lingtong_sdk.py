import asyncio
import httpx

async def find_and_test_sdk():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 先获取 SDK 列表
        try:
            # 获取所有 SDK
            r = await client.get('http://127.0.0.1:8000/api/sdk/')
            print(f"SDK 列表状态码: {r.status_code}")
            if r.status_code == 200:
                sdks = r.json()
                print(f"找到 {len(sdks)} 个 SDK")
                
                # 查找 lingtong-assistant
                lingtong_sdk = None
                for sdk in sdks:
                    name = sdk.get('name', '').lower()
                    if 'lingtong' in name or '灵童' in name:
                        lingtong_sdk = sdk
                        print(f"找到灵童 SDK: {sdk}")
                        break
                
                if not lingtong_sdk:
                    # 列出所有 SDK
                    print("\n所有 SDK:")
                    for sdk in sdks:
                        print(f"  - {sdk.get('name')} (token: {sdk.get('token', '')[:16]}...)")
            else:
                print(f"响应: {r.text[:500]}")
        except Exception as e:
            print(f"获取 SDK 列表失败: {e}")

asyncio.run(find_and_test_sdk())
