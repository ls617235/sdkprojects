"""
灵童平台 API 客户端
用于与灵童平台交互，获取认证Token
"""
import httpx
import datetime
from typing import Optional, Dict, Any
from loguru import logger


class LingTongClient:
    """灵童平台API客户端"""
    
    def __init__(self, base_url: str, app_id: str = None, app_secret: str = None):
        self.base_url = base_url.rstrip('/')
        self.app_id = app_id
        self.app_secret = app_secret
        self._token: Optional[str] = None
    
    async def login(self, username: str, login_type: str = "account") -> Dict[str, Any]:
        """
        登录获取Token
        
        Args:
            username: 用户名
            login_type: 登录类型 (account, mobile, email)
        
        Returns:
            {
                "success": True,
                "token": "xxx",
                "user": {...}
            }
        """
        try:
            logger.info(f"开始灵童平台登录 - 用户名: {username}, 类型: {login_type}")
            logger.info(f"登录地址: {self.base_url}/api/login/account_dan")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 登录请求
                request_data = {
                    "username": username,
                    "type": login_type
                }
                logger.debug(f"登录请求数据: {request_data}")
                
                response = await client.post(
                    f"{self.base_url}/api/login/account_dan",
                    json=request_data,
                    headers={
                        "Content-Type": "application/json"
                    }
                )
                
                logger.info(f"登录响应状态码: {response.status_code}")
                data = response.json()
                logger.debug(f"登录响应数据: {data}")
                
                if data.get("success"):
                    self._token = data.get("auth_token")
                    logger.info(f"登录成功 - Token: {self._token[:20]}...")
                    return {
                        "success": True,
                        "token": self._token,
                        "token_expiry": data.get("token_expiry"),
                        "user_role": data.get("currentAuthority"),
                        "message": data.get("message")
                    }
                else:
                    logger.warning(f"登录失败: {data.get('message', '登录失败')}")
                    return {
                        "success": False,
                        "message": data.get("message", "登录失败")
                    }
                    
        except httpx.HTTPError as e:
            logger.error(f"灵童平台登录失败 - 网络错误: {e}")
            return {
                "success": False,
                "message": f"网络错误: {str(e)}"
            }
        except Exception as e:
            logger.error(f"灵童平台登录异常: {e}")
            return {
                "success": False,
                "message": f"登录异常: {str(e)}"
            }
    
    def set_token(self, token: str):
        """手动设置Token"""
        self._token = token
    
    @property
    def token(self) -> Optional[str]:
        """获取当前Token"""
        return self._token
    
    async def request(
        self,
        method: str,
        endpoint: str,
        data: Dict[str, Any] = None,
        params: Dict[str, Any] = None,
        require_auth: bool = True
    ) -> Dict[str, Any]:
        """
        通用请求方法
        
        Args:
            method: HTTP方法 (GET, POST, PUT, DELETE)
            endpoint: API端点
            data: 请求数据
            params: URL参数
            require_auth: 是否需要认证
        
        Returns:
            API响应数据
        """
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Content-Type": "application/json"
        }
        
        if require_auth and self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        
        try:
            # 详细的请求日志
            logger.info(f"[灵童平台] 开始请求 - 方法: {method}, 端点: {endpoint}")
            logger.info(f"[灵童平台] 请求地址: {url}")
            logger.debug(f"[灵童平台] 请求头: {headers}")
            if params:
                logger.debug(f"[灵童平台] 请求参数: {params}")
            if data:
                logger.debug(f"[灵童平台] 请求数据: {data}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                start_time = datetime.datetime.now()
                
                if method.upper() == "GET":
                    response = await client.get(url, params=params, headers=headers)
                elif method.upper() == "POST":
                    response = await client.post(url, json=data, headers=headers)
                elif method.upper() == "PUT":
                    response = await client.put(url, json=data, headers=headers)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, params=params, headers=headers)
                else:
                    logger.error(f"[灵童平台] 不支持的HTTP方法: {method}")
                    return {"success": False, "message": f"不支持的HTTP方法: {method}"}
                
                end_time = datetime.datetime.now()
                duration = (end_time - start_time).total_seconds()
                
                # 详细的响应日志
                logger.info(f"[灵童平台] 请求响应 - 状态码: {response.status_code}, 耗时: {duration:.3f}s")
                logger.info(f"[灵童平台] 响应头: {dict(response.headers)}")
                
                try:
                    response_data = response.json()
                    logger.debug(f"[灵童平台] 响应数据: {response_data}")
                except Exception as json_error:
                    logger.error(f"[灵童平台] 响应解析失败: {json_error}")
                    logger.debug(f"[灵童平台] 原始响应: {response.text}")
                    response_data = {"success": False, "message": "响应解析失败"}
                
                return response_data
                
        except httpx.HTTPError as e:
            logger.error(f"[灵童平台] 请求失败 - 网络错误: {e}")
            return {"success": False, "message": f"网络错误: {str(e)}"}
        except Exception as e:
            logger.error(f"[灵童平台] 请求异常: {e}")
            import traceback
            logger.debug(f"[灵童平台] 异常堆栈: {traceback.format_exc()}")
            return {"success": False, "message": f"请求异常: {str(e)}"}
    
    async def get(self, endpoint: str, params: Dict[str, Any] = None, require_auth: bool = True) -> Dict[str, Any]:
        """GET请求"""
        return await self.request("GET", endpoint, params=params, require_auth=require_auth)
    
    async def post(self, endpoint: str, data: Dict[str, Any] = None, require_auth: bool = True) -> Dict[str, Any]:
        """POST请求"""
        return await self.request("POST", endpoint, data=data, require_auth=require_auth)
    
    async def put(self, endpoint: str, data: Dict[str, Any] = None, require_auth: bool = True) -> Dict[str, Any]:
        """PUT请求"""
        return await self.request("PUT", endpoint, data=data, require_auth=require_auth)
    
    async def delete(self, endpoint: str, params: Dict[str, Any] = None, require_auth: bool = True) -> Dict[str, Any]:
        """DELETE请求"""
        return await self.request("DELETE", endpoint, params=params, require_auth=require_auth)


# 全局客户端实例（需要在初始化时配置）
_lingtong_client: Optional[LingTongClient] = None


def init_lingtong_client(base_url: str, app_id: str = None, app_secret: str = None) -> LingTongClient:
    """初始化灵童平台客户端"""
    global _lingtong_client
    _lingtong_client = LingTongClient(base_url, app_id, app_secret)
    return _lingtong_client


def get_lingtong_client() -> Optional[LingTongClient]:
    """获取灵童平台客户端实例"""
    return _lingtong_client
