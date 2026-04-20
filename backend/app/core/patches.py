# app/core/patches.py
import re
from loguru import logger  # type: ignore
from sqlalchemy.dialects.postgresql.base import PGDialect  # type: ignore


def _patch_kingbase_version_parser():
    """
    Monkey patch SQLAlchemy 的 PostgreSQL 方言，
    使其能正确解析 Kingbase（人大金仓）的版本字符串，
    例如：'Kingbase V8R6C3B1' → (8, 6, 3)
    """

    def _get_server_version_info(self, connection):
        result = connection.exec_driver_sql("SELECT version()").fetchone()
        if not result:
            raise ValueError("无法从数据库获取版本信息")

        version_str = result[0]
        logger.debug(f"🔍 原始数据库版本字符串: {version_str}")

        # 尝试匹配 Kingbase / KingbaseES 格式
        kingbase_match = re.match(
            r".*(?:Kingbase|KingbaseES)\s+V(\d+)R(\d+)(?:C(\d+))?",
            version_str,
            re.IGNORECASE
        )
        if kingbase_match:
            major = int(kingbase_match.group(1))
            minor = int(kingbase_match.group(2))
            patch = int(kingbase_match.group(3)) if kingbase_match.group(3) else 0
            version_tuple = (major, minor, patch)
            logger.info(f"✅ 成功解析 Kingbase 版本: {version_tuple}")
            return version_tuple

        # 回退到标准 PostgreSQL 格式（可选）
        pg_match = re.match(r".*PostgreSQL (\d+)\.(\d+)(?:\.(\d+))?", version_str)
        if pg_match:
            return tuple(int(x) for x in pg_match.groups() if x is not None)

        # 完全无法识别时，返回一个安全的默认版本（如 PostgreSQL 12）
        logger.warning("⚠️ 无法识别数据库版本，使用默认版本 (12, 0, 0)")
        return (12, 0, 0)

    # 应用补丁
    PGDialect._get_server_version_info = _get_server_version_info
    logger.info("🔧 已应用 Kingbase 版本解析补丁")


# 可选：提供统一应用所有补丁的函数
def apply_all_patches():
    """应用项目所需的所有 monkey patch"""
    _patch_kingbase_version_parser()