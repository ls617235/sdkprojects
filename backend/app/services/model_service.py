"""
模型配置服务层
管理 AI 模型配置，支持自定义模型和提示词
"""
import hashlib
import secrets
from datetime import datetime
from typing import List, Optional

from app.core.database import DatabasePool


class ModelConfigService:
    """模型配置服务"""

    def __init__(self, db: DatabasePool):
        self.db = db

    def _generate_id(self) -> str:
        """生成唯一 ID"""
        return hashlib.sha256(
            f"{secrets.token_hex(16)}:{datetime.utcnow().timestamp()}".encode()
        ).hexdigest()[:32]

    async def create_model(
        self,
        model_id: str,
        name: str,
        description: Optional[str] = None,
        provider: str = "custom",
        api_endpoint: Optional[str] = None,
        api_key_env: Optional[str] = None,
        system_prompt: Optional[str] = None,
        config: Optional[dict] = None,
        is_default: bool = False,
        is_active: bool = True,
    ) -> dict:
        """创建模型配置"""
        model_db_id = self._generate_id()
        now = datetime.utcnow()

        # 如果设置为默认，先取消其他默认模型
        if is_default:
            await self.db.execute(
                "UPDATE model_configs SET is_default = FALSE WHERE is_default = TRUE"
            )

        import json
        await self.db.execute(
            """
            INSERT INTO model_configs 
            (id, model_id, name, description, provider, api_endpoint, api_key_env, 
             system_prompt, config, is_default, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            """,
            model_db_id,
            model_id,
            name,
            description,
            provider,
            api_endpoint,
            api_key_env,
            system_prompt,
            json.dumps(config or {}),
            is_default,
            is_active,
            now,
            now,
        )

        return {
            "id": model_db_id,
            "model_id": model_id,
            "name": name,
            "description": description,
            "provider": provider,
            "api_endpoint": api_endpoint,
            "api_key_env": api_key_env,
            "system_prompt": system_prompt,
            "config": config or {},
            "is_default": is_default,
            "is_active": is_active,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

    async def list_models(self, include_inactive: bool = False) -> List[dict]:
        """获取模型配置列表"""
        if include_inactive:
            rows = await self.db.fetch(
                """
                SELECT id, model_id, name, description, provider, api_endpoint, 
                       api_key_env, system_prompt, config, is_default, is_active, 
                       created_at, updated_at
                FROM model_configs
                ORDER BY is_default DESC, created_at DESC
                """
            )
        else:
            rows = await self.db.fetch(
                """
                SELECT id, model_id, name, description, provider, api_endpoint, 
                       api_key_env, system_prompt, config, is_default, is_active, 
                       created_at, updated_at
                FROM model_configs
                WHERE is_active = TRUE
                ORDER BY is_default DESC, created_at DESC
                """
            )

        result = []
        for row in rows:
            row_dict = dict(row)
            # 转换时间格式
            if 'created_at' in row_dict and row_dict['created_at']:
                row_dict['created_at'] = row_dict['created_at'].isoformat()
            if 'updated_at' in row_dict and row_dict['updated_at']:
                row_dict['updated_at'] = row_dict['updated_at'].isoformat()
            # 转换config为字典
            if 'config' in row_dict and row_dict['config']:
                import json
                try:
                    if isinstance(row_dict['config'], str):
                        row_dict['config'] = json.loads(row_dict['config'])
                except:
                    row_dict['config'] = {}
            result.append(row_dict)
        return result

    async def get_model(self, model_db_id: str) -> Optional[dict]:
        """获取模型配置详情"""
        row = await self.db.fetchrow(
            """
            SELECT id, model_id, name, description, provider, api_endpoint, 
                   api_key_env, system_prompt, config, is_default, is_active, 
                   created_at, updated_at
            FROM model_configs
            WHERE id = $1
            """,
            model_db_id,
        )

        if not row:
            return None

        row_dict = dict(row)
        # 转换时间格式
        if 'created_at' in row_dict and row_dict['created_at']:
            row_dict['created_at'] = row_dict['created_at'].isoformat()
        if 'updated_at' in row_dict and row_dict['updated_at']:
            row_dict['updated_at'] = row_dict['updated_at'].isoformat()
        # 转换config为字典
        if 'config' in row_dict and row_dict['config']:
            import json
            try:
                if isinstance(row_dict['config'], str):
                    row_dict['config'] = json.loads(row_dict['config'])
            except:
                row_dict['config'] = {}
        return row_dict

    async def get_default_model(self) -> Optional[dict]:
        """获取默认模型配置"""
        row = await self.db.fetchrow(
            """
            SELECT id, model_id, name, description, provider, api_endpoint, 
                   api_key_env, system_prompt, config, is_default, is_active, 
                   created_at, updated_at
            FROM model_configs
            WHERE is_default = TRUE AND is_active = TRUE
            LIMIT 1
            """
        )

        if not row:
            # 如果没有默认模型，返回第一个启用的模型
            row = await self.db.fetchrow(
                """
                SELECT id, model_id, name, description, provider, api_endpoint, 
                       api_key_env, system_prompt, config, is_default, is_active, 
                       created_at, updated_at
                FROM model_configs
                WHERE is_active = TRUE
                ORDER BY created_at DESC
                LIMIT 1
                """
            )

        if not row:
            return None

        row_dict = dict(row)
        # 转换时间格式
        if 'created_at' in row_dict and row_dict['created_at']:
            row_dict['created_at'] = row_dict['created_at'].isoformat()
        if 'updated_at' in row_dict and row_dict['updated_at']:
            row_dict['updated_at'] = row_dict['updated_at'].isoformat()
        # 转换config为字典
        if 'config' in row_dict and row_dict['config']:
            import json
            try:
                if isinstance(row_dict['config'], str):
                    row_dict['config'] = json.loads(row_dict['config'])
            except:
                row_dict['config'] = {}
        return row_dict

    async def update_model(
        self,
        model_db_id: str,
        model_id: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        provider: Optional[str] = None,
        api_endpoint: Optional[str] = None,
        api_key_env: Optional[str] = None,
        system_prompt: Optional[str] = None,
        config: Optional[dict] = None,
        is_default: Optional[bool] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[dict]:
        """更新模型配置"""
        # 获取当前配置
        current = await self.get_model(model_db_id)
        if not current:
            return None

        # 如果设置为默认，先取消其他默认模型
        if is_default:
            await self.db.execute(
                "UPDATE model_configs SET is_default = FALSE WHERE is_default = TRUE"
            )

        # 构建更新字段
        updates = []
        values = []
        param_idx = 1

        if model_id is not None:
            updates.append(f"model_id = ${param_idx}")
            values.append(model_id)
            param_idx += 1
        if name is not None:
            updates.append(f"name = ${param_idx}")
            values.append(name)
            param_idx += 1
        if description is not None:
            updates.append(f"description = ${param_idx}")
            values.append(description)
            param_idx += 1
        if provider is not None:
            updates.append(f"provider = ${param_idx}")
            values.append(provider)
            param_idx += 1
        if api_endpoint is not None:
            updates.append(f"api_endpoint = ${param_idx}")
            values.append(api_endpoint)
            param_idx += 1
        if api_key_env is not None:
            updates.append(f"api_key_env = ${param_idx}")
            values.append(api_key_env)
            param_idx += 1
        if system_prompt is not None:
            updates.append(f"system_prompt = ${param_idx}")
            values.append(system_prompt)
            param_idx += 1
        if config is not None:
            updates.append(f"config = ${param_idx}")
            import json
            values.append(json.dumps(config))
            param_idx += 1
        if is_default is not None:
            updates.append(f"is_default = ${param_idx}")
            values.append(is_default)
            param_idx += 1
        if is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            values.append(is_active)
            param_idx += 1

        updates.append(f"updated_at = ${param_idx}")
        values.append(datetime.utcnow())
        param_idx += 1

        values.append(model_db_id)

        await self.db.execute(
            f"""
            UPDATE model_configs
            SET {', '.join(updates)}
            WHERE id = ${param_idx}
            """,
            *values,
        )

        return await self.get_model(model_db_id)

    async def delete_model(self, model_db_id: str) -> bool:
        """删除模型配置"""
        result = await self.db.execute(
            "DELETE FROM model_configs WHERE id = $1",
            model_db_id,
        )
        return result != "DELETE 0"

    async def set_default_model(self, model_db_id: str) -> Optional[dict]:
        """设置默认模型"""
        # 先取消所有默认模型
        await self.db.execute(
            "UPDATE model_configs SET is_default = FALSE WHERE is_default = TRUE"
        )

        # 设置指定模型为默认
        await self.db.execute(
            """
            UPDATE model_configs 
            SET is_default = TRUE, updated_at = $1
            WHERE id = $2
            """,
            datetime.utcnow(),
            model_db_id,
        )

        return await self.get_model(model_db_id)

    async def init_default_models(self) -> List[dict]:
        """初始化默认模型配置"""
        # 检查是否已有模型
        existing = await self.list_models()
        if existing:
            # 确保返回的数据格式与create_model一致
            processed_models = []
            for model in existing:
                # 确保config是字典
                if isinstance(model.get('config'), str):
                    import json
                    try:
                        model['config'] = json.loads(model['config'])
                    except:
                        model['config'] = {}
                # 确保created_at和updated_at是字符串
                if isinstance(model.get('created_at'), datetime):
                    model['created_at'] = model['created_at'].isoformat()
                if isinstance(model.get('updated_at'), datetime):
                    model['updated_at'] = model['updated_at'].isoformat()
                processed_models.append(model)
            return processed_models

        # 默认模型配置
        default_models = [
            {
                "model_id": "doubao-seed-2-0-pro-260215",
                "name": "Doubao Pro",
                "description": "旗舰模型，适合复杂推理",
                "provider": "doubao",
                "is_default": False,
            },
            {
                "model_id": "doubao-seed-2-0-lite-260215",
                "name": "Doubao Lite",
                "description": "平衡性能与成本",
                "provider": "doubao",
                "is_default": False,
            },
            {
                "model_id": "doubao-seed-1-8-251228",
                "name": "Doubao 1.8",
                "description": "默认模型，Agent 优化",
                "provider": "doubao",
                "is_default": True,
            },
            {
                "model_id": "deepseek-v3-2-251201",
                "name": "DeepSeek V3.2",
                "description": "高级推理能力",
                "provider": "deepseek",
                "is_default": False,
            },
            {
                "model_id": "kimi-k2-5-260127",
                "name": "Kimi K2.5",
                "description": "代码、视觉、多模态",
                "provider": "kimi",
                "is_default": False,
            },
        ]

        created_models = []
        for model_data in default_models:
            model = await self.create_model(**model_data)
            created_models.append(model)

        return created_models


# 依赖注入函数
async def get_model_service(db: DatabasePool = None) -> ModelConfigService:
    """获取模型配置服务实例"""
    if db is None:
        from app.core.database import get_db
        db = await get_db()
    return ModelConfigService(db)